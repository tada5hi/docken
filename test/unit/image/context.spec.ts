/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listBuildContextFiles } from '../../../src';

describe('listBuildContextFiles', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'docken-ctx-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('lists files honouring .dockerignore and keeps Dockerfile and .dockerignore', async () => {
        const files = await listBuildContextFiles(path.join(__dirname, '../../data/build-context'));

        expect(files).toEqual(['.dockerignore', 'Dockerfile', 'keep.txt', 'nested/keep.txt']);
    });

    it('lists everything without a .dockerignore', async () => {
        fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch');
        fs.mkdirSync(path.join(dir, 'a'));
        fs.writeFileSync(path.join(dir, 'a', 'b.txt'), 'x');

        expect(await listBuildContextFiles(dir)).toEqual(['Dockerfile', 'a/b.txt']);
    });

    it('keeps a custom dockerfile name', async () => {
        fs.writeFileSync(path.join(dir, 'build.Dockerfile'), 'FROM scratch');
        fs.writeFileSync(path.join(dir, 'a.txt'), 'x');
        fs.writeFileSync(path.join(dir, '.dockerignore'), 'build.Dockerfile\n');

        expect(await listBuildContextFiles(dir, 'build.Dockerfile'))
            .toEqual(['.dockerignore', 'a.txt', 'build.Dockerfile']);
    });

    it('does not follow symlinks and tolerates broken ones', async () => {
        const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'docken-out-'));

        try {
            fs.writeFileSync(path.join(outside, 'leak.txt'), 'x');
            fs.symlinkSync(outside, path.join(dir, 'link'));
            fs.symlinkSync(path.join(dir, 'missing'), path.join(dir, 'dangling'));

            expect(await listBuildContextFiles(dir)).toEqual(['dangling', 'link']);
        } finally {
            fs.rmSync(outside, { recursive: true, force: true });
        }
    });
});
