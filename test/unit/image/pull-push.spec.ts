/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
});
