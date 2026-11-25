/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { buildImage, isModemStreamError } from '../../../src';
import { createFakeClient } from '../../helpers/fake-client';

describe('buildImage', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('packs a directory', async () => {
        const { client, calls } = createFakeClient([{ aux: { ID: 'sha256:abc' } }]);

        const result = await buildImage(
            client,
            { context: path.join(__dirname, '../../data/build-context'), t: 'x:1' },
            { timeout: 5000 },
        );

        expect(result).toEqual({ imageId: 'sha256:abc' });

        const [context, opts] = calls.buildImage.mock.calls[0];

        expect(typeof context.pipe).toBe('function');
        expect(opts).not.toHaveProperty('context');
        expect(opts.t).toBe('x:1');
        expect(opts.abortSignal).toBeDefined();
    });

    it('passes a stream through untouched', async () => {
        const { client, calls } = createFakeClient([]);
        const tar = new Readable({ read() { this.push(null); } });

        const result = await buildImage(client, { context: tar });

        expect(result).toEqual({ imageId: undefined });
        expect(calls.buildImage.mock.calls[0][0]).toBe(tar);
    });

    it('destroys the packed context when the build fails', async () => {
        const { client, calls } = createFakeClient([]);

        calls.buildImage.mockRejectedValueOnce(new Error('boom'));

        await expect(buildImage(
            client,
            { context: path.join(__dirname, '../../data/build-context') },
        )).rejects.toThrow('boom');

        const [tar] = calls.buildImage.mock.calls[0];

        // tar-stream's pack flags destruction as _destroyed
        expect(tar.destroyed || tar._destroyed).toBe(true);
    });

    it('does not destroy a caller supplied stream on failure', async () => {
        const { client, calls } = createFakeClient([]);
        const tar = new Readable({ read() { this.push(null); } });

        calls.buildImage.mockRejectedValueOnce(new Error('boom'));

        await expect(buildImage(client, { context: tar })).rejects.toThrow('boom');
        expect(tar.destroyed).toBe(false);
    });

    it('does not prepare the context for an already aborted signal', async () => {
        const { client, calls } = createFakeClient([]);
        const readFile = vi.spyOn(fs.promises, 'readFile');
        const readdir = vi.spyOn(fs.promises, 'readdir');

        const error = await buildImage(
            client,
            { context: path.join(__dirname, '../../data/build-context') },
            { signal: AbortSignal.abort() },
        ).catch((e) => e);

        expect(isModemStreamError(error) && error.aborted).toBe(true);
        expect(error.output).toEqual([]);
        expect(readFile).not.toHaveBeenCalled();
        expect(readdir).not.toHaveBeenCalled();
        expect(calls.buildImage).not.toHaveBeenCalled();
    });

    it('rejects promptly on an abort while the context is prepared', async () => {
        const { client, calls } = createFakeClient([]);
        const controller = new AbortController();

        // the .dockerignore read never settles
        vi.spyOn(fs.promises, 'readFile').mockImplementation(() => new Promise(() => {}));

        const promise = buildImage(
            client,
            { context: path.join(__dirname, '../../data/build-context') },
            { signal: controller.signal },
        ).catch((e) => e);

        await new Promise((resolve) => {
            setTimeout(resolve, 10);
        });
        controller.abort();

        const error = await promise;

        expect(isModemStreamError(error) && error.aborted).toBe(true);
        expect(error.output).toEqual([]);
        expect(calls.buildImage).not.toHaveBeenCalled();
    });

    it('rejects with an aborted error on a timeout while the context is prepared', async () => {
        const { client } = createFakeClient([]);

        vi.spyOn(fs.promises, 'readFile').mockImplementation(() => new Promise(() => {}));

        const error = await buildImage(
            client,
            { context: path.join(__dirname, '../../data/build-context') },
            { timeout: 20 },
        ).catch((e) => e);

        expect(isModemStreamError(error) && error.aborted).toBe(true);
        expect(error.message).toBe('The stream timed out.');
    });
});
