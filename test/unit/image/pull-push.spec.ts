/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { isModemStreamError, pullImage, pushImage } from '../../../src';
import { createFakeClient } from '../../helpers/fake-client';

async function catchError(promise: Promise<unknown>): Promise<any> {
    try {
        await promise;
    } catch (e) {
        return e;
    }

    return undefined;
}

describe('pullImage / pushImage', () => {
    it('pulls with auth and platform and returns the digest', async () => {
        const { client, calls } = createFakeClient([{ status: 'Digest: sha256:abc' }]);
        const authconfig = { username: 'u', password: 'p' };

        const result = await pullImage(client, 'alpine:3', { authconfig, platform: 'linux/amd64' });

        expect(calls.pull).toHaveBeenCalledWith('alpine:3', {
            authconfig, platform: 'linux/amd64', abortSignal: undefined,
        });
        expect(result).toEqual({ digest: 'sha256:abc' });
    });

    it('pushes a tag and returns digest and size', async () => {
        const { client, calls } = createFakeClient([
            { progressDetail: {}, aux: { Tag: 'latest', Digest: 'sha256:def', Size: 528 } },
        ]);
        const authconfig = { username: 'u', password: 'p' };

        const result = await pushImage(client, 'repo/x', { authconfig, tag: 'latest' });

        expect(calls.getImage).toHaveBeenCalledWith('repo/x');
        expect(calls.push).toHaveBeenCalledWith({ authconfig, tag: 'latest', abortSignal: undefined });
        expect(result).toEqual({ digest: 'sha256:def', size: 528 });

        const image = { push: vi.fn(async (...args: any[]) => calls.push(...args)) };
        const direct = await pushImage(client, image as any);

        expect(image.push).toHaveBeenCalled();
        expect(direct).toEqual({ digest: 'sha256:def', size: 528 });
    });

    describe('digest sources', () => {
        const d4 = `sha256:${'4'.repeat(64)}`;
        const d5 = `sha256:${'5'.repeat(64)}`;

        it('reads the selected manifest of the containerd image store', async () => {
            // output of a push with the containerd image store (Docker 29)
            const { client } = createFakeClient([
                { status: 'The push refers to repository [localhost:5000/x]' },
                { status: 'Pushed', progressDetail: {}, id: '3f26bc2dec0b' },
                {
                    progressDetail: {},
                    aux: {
                        manifestPushedInsteadOfIndex: true,
                        originalIndex: { digest: d4, size: 9226 },
                        selectedManifest: { digest: d5, size: 1026 },
                    },
                },
                { status: `v1: digest: ${d5} size: 1026` },
            ]);

            expect(await pushImage(client, 'localhost:5000/x:v1')).toEqual({ digest: d5, size: 1026 });
        });

        it('falls back to the status line when no aux chunk is sent', async () => {
            const { client } = createFakeClient([
                { status: 'Pushed', progressDetail: {}, id: 'a' },
                { status: `v1: digest: ${d4} size: 1026` },
            ]);

            expect(await pushImage(client, 'repo/x')).toEqual({ digest: d4, size: 1026 });
        });

        it('prefers the classic aux digest over the other sources', async () => {
            const { client } = createFakeClient([
                { progressDetail: {}, aux: { Tag: 'v1', Digest: 'sha256:def', Size: 528 } },
                { progressDetail: {}, aux: { selectedManifest: { digest: d5, size: 1 } } },
                { status: `v1: digest: ${d4} size: 1026` },
            ]);

            expect(await pushImage(client, 'repo/x')).toEqual({ digest: 'sha256:def', size: 528 });
        });

        it('ignores sources naming another tag when a tag is given', async () => {
            const { client } = createFakeClient([
                { progressDetail: {}, aux: { Tag: 'v1', Digest: d4, Size: 1 } },
                { status: `v1: digest: ${d4} size: 1` },
                { status: `v2: digest: ${d5} size: 2` },
            ]);

            expect(await pushImage(client, 'repo/x', { tag: 'v2' })).toEqual({ digest: d5, size: 2 });
        });

        it('accepts other digest algorithms', async () => {
            const digest = `sha512:${'a'.repeat(128)}`;
            const { client } = createFakeClient([{ status: `latest: digest: ${digest} size: 7` }]);

            expect(await pushImage(client, 'repo/x')).toEqual({ digest, size: 7 });
        });

        it('fills a missing size only from a source with the same digest', async () => {
            const same = createFakeClient([
                { progressDetail: {}, aux: { Tag: 'v1', Digest: d4 } },
                { status: `v1: digest: ${d4} size: 1026` },
            ]);
            const other = createFakeClient([
                { progressDetail: {}, aux: { Tag: 'v1', Digest: d4 } },
                { status: `v1: digest: ${d5} size: 1026` },
            ]);

            expect(await pushImage(same.client, 'repo/x')).toEqual({ digest: d4, size: 1026 });
            expect(await pushImage(other.client, 'repo/x')).toEqual({ digest: d4, size: undefined });
        });

        it('resolves without a digest when the daemon reports none', async () => {
            const { client } = createFakeClient([{ status: 'Pushed', progressDetail: {}, id: 'a' }]);

            expect(await pushImage(client, 'repo/x')).toEqual({ digest: undefined, size: undefined });
        });
    });

    it('still calls the caller\'s callbacks', async () => {
        const { client } = createFakeClient([
            { status: 'Pushing', id: 'a', progressDetail: { current: 1, total: 2 } },
            { status: 'Digest: sha256:abc' },
        ]);
        const onEvent = vi.fn();
        const onPushingTotal = vi.fn();

        await pushImage(client, 'repo/x', {}, { onEvent, onPushingTotal });

        expect(onEvent).toHaveBeenCalled();
        expect(onPushingTotal).toHaveBeenCalled();
    });

    it('normalises an abort before the stream exists', async () => {
        const { client, calls } = createFakeClient([]);
        const controller = new AbortController();

        calls.pull.mockImplementation(async () => {
            controller.abort();
            const error = new Error('aborted');
            error.name = 'AbortError';
            throw error;
        });

        const error = await catchError(pullImage(client, 'alpine:3', {}, { signal: controller.signal }));

        expect(isModemStreamError(error)).toBe(true);
        expect(error.aborted).toBe(true);
        expect(error.output).toEqual([]);
    });

    it('timeout covers the request phase', async () => {
        const { client, calls } = createFakeClient([]);

        calls.pull.mockImplementation((_ref: string, opts: { abortSignal: AbortSignal }) => new Promise((_resolve, reject) => {
            opts.abortSignal.addEventListener('abort', () => reject(new Error('request aborted')));
        }));

        const error = await catchError(pullImage(client, 'alpine:3', {}, { timeout: 20 }));

        expect(isModemStreamError(error)).toBe(true);
        expect(error.message).toBe('The stream timed out.');
        expect(error.aborted).toBe(true);
        expect(error.output).toEqual([]);
    });

    it('does not start for an already aborted signal', async () => {
        const { client, calls } = createFakeClient([]);

        const error = await catchError(pullImage(client, 'alpine:3', {}, { signal: AbortSignal.abort() }));

        expect(isModemStreamError(error)).toBe(true);
        expect(error.aborted).toBe(true);
        expect(calls.pull).not.toHaveBeenCalled();
    });

    it('rejects on abort and destroys a stream that arrives late', async () => {
        const { client, calls } = createFakeClient([]);
        const controller = new AbortController();
        const late = new Readable({ read() {} });
        let resolveStream: (stream: Readable) => void = () => {};

        // ignores its abort signal and resolves only when told
        calls.pull.mockImplementation(() => new Promise((resolve) => {
            resolveStream = resolve;
        }));

        const promise = catchError(pullImage(client, 'alpine:3', {}, { signal: controller.signal }));

        controller.abort();

        const error = await promise;

        expect(isModemStreamError(error)).toBe(true);
        expect(error.aborted).toBe(true);

        resolveStream(late);
        await new Promise((resolve) => {
            setImmediate(resolve);
        });

        expect(late.destroyed).toBe(true);
    });
});
