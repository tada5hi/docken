/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { buildImage } from '../../../src';
import { createFakeClient } from '../../helpers/fake-client';

describe('buildImage', () => {
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
});
