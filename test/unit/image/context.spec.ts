/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extract } from 'tar-stream';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listBuildContextFiles, packBuildContext } from '../../../src/image/context';

async function readTarNames(stream: NodeJS.ReadableStream) : Promise<string[]> {
    const names : string[] = [];
    const extractor = extract();

    extractor.on('entry', (header, entry, next) => {
        names.push(header.name);
        entry.on('end', next);
        entry.resume();
    });

    await new Promise<void>((resolve, reject) => {
        extractor.on('finish', resolve);
        extractor.on('error', reject);
        stream.pipe(extractor);
    });

    return names.sort();
}

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

    it('rejects when .dockerignore exists but cannot be read', async () => {
        fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch');
        fs.mkdirSync(path.join(dir, '.dockerignore'));

        await expect(listBuildContextFiles(dir)).rejects.toMatchObject({ code: 'EISDIR' });
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

    it.skipIf(process.getuid?.() === 0)('does not walk a directory excluded without exceptions', async () => {
        fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch');
        fs.writeFileSync(path.join(dir, '.dockerignore'), 'data/\n');
        fs.mkdirSync(path.join(dir, 'data'));
        fs.writeFileSync(path.join(dir, 'data', 'x.txt'), 'x');
        fs.chmodSync(path.join(dir, 'data'), 0o000);

        try {
            expect(await listBuildContextFiles(dir)).toEqual(['.dockerignore', 'Dockerfile']);
        } finally {
            fs.chmodSync(path.join(dir, 'data'), 0o755);
        }
    });

    it('lists empty directories (without trailing slash) and packs them', async () => {
        fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch');
        fs.mkdirSync(path.join(dir, 'empty'));
        fs.mkdirSync(path.join(dir, 'a', 'b'), { recursive: true });
        fs.mkdirSync(path.join(dir, 'c'));
        fs.writeFileSync(path.join(dir, 'c', 'd.txt'), 'x');

        expect(await listBuildContextFiles(dir)).toEqual(['Dockerfile', 'a/b', 'c/d.txt', 'empty']);
        expect(await readTarNames(await packBuildContext(dir))).toEqual(['Dockerfile', 'a/b', 'c/d.txt', 'empty']);
    });

    it('lists a directory whose children are all excluded, without its children', async () => {
        fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch');
        fs.writeFileSync(path.join(dir, '.dockerignore'), 'cache/*\nskip/\n!keep.txt\n');
        fs.mkdirSync(path.join(dir, 'cache'));
        fs.writeFileSync(path.join(dir, 'cache', 'x.txt'), 'x');
        fs.mkdirSync(path.join(dir, 'skip'));
        fs.writeFileSync(path.join(dir, 'skip', 'y.txt'), 'y');

        expect(await listBuildContextFiles(dir)).toEqual(['.dockerignore', 'Dockerfile', 'cache']);
        expect(await readTarNames(await packBuildContext(dir))).toEqual(['.dockerignore', 'Dockerfile', 'cache']);
    });

    it('stops the walk for an aborted signal', async () => {
        fs.writeFileSync(path.join(dir, 'Dockerfile'), 'FROM scratch');

        await expect(listBuildContextFiles(dir, undefined, AbortSignal.abort()))
            .rejects.toMatchObject({ name: 'AbortError' });
        await expect(packBuildContext(dir, undefined, AbortSignal.abort()))
            .rejects.toMatchObject({ name: 'AbortError' });
    });
});
