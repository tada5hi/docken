/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scanDirectory } from '../../../src';

async function touch(root: string, ...segments: string[]) {
    const file = path.join(root, ...segments);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, 'FROM scratch\n');
}

describe('scan options', () => {
    let tmp: string;

    beforeEach(async () => {
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'docken-'));
    });

    afterEach(async () => {
        await fs.rm(tmp, { recursive: true, force: true });
    });

    it('skips .git and node_modules by default', async () => {
        await touch(tmp, 'node_modules', 'x', 'Dockerfile');
        await touch(tmp, '.git', 'y', 'Dockerfile');

        const result = await scanDirectory(tmp);
        expect(result.images).toEqual([]);
    });

    it('ignore replaces the default', async () => {
        await touch(tmp, 'node_modules', 'x', 'Dockerfile');
        await touch(tmp, 'vendor', 'z', 'Dockerfile');

        const result = await scanDirectory(tmp, { ignore: ['vendor'] });
        expect(result.images.map((i) => i.path)).toEqual(['node_modules/x']);
    });

    it('still walks an ignored root', async () => {
        await touch(tmp, 'node_modules', 'x', 'Dockerfile');

        const result = await scanDirectory(path.join(tmp, 'node_modules'));
        expect(result.images.map((i) => i.path)).toEqual(['x']);
    });

    it('maxDepth limits the walk', async () => {
        const result = await scanDirectory('test/data/scan', { maxDepth: 1 });
        expect(result.images.map((i) => i.path)).toEqual(['image']);
        expect(result.groups.map((i) => i.path)).toEqual(['group']);
    });

    it('does not follow symlinked directories', async () => {
        await touch(tmp, 'real', 'Dockerfile');
        await fs.symlink(path.join(tmp, 'real'), path.join(tmp, 'link'), 'dir');

        const result = await scanDirectory(tmp);
        expect(result.images.map((i) => i.path)).toEqual(['real']);
    });
});
