/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
    MetaType,
    ScanValidationError,
    scanDirectory,
    scanDirectoryTree,
} from '../../../src';
import type { ScanTreeItem } from '../../../src';

function flatten(items: ScanTreeItem[]) : string[] {
    return items.flatMap((item) => [item.path, ...flatten(item.children)]);
}

describe('scanDirectoryTree', () => {
    it('nests items under their group', async () => {
        const tree = await scanDirectoryTree('test/data/scan');

        expect(tree.map((item) => [item.path, item.type])).toEqual([
            ['group', MetaType.GROUP],
            ['image', MetaType.IMAGE],
        ]);

        expect(tree[0].children.map((item) => item.path)).toEqual([
            'group/image',
            'group/sub-group',
            'group/undefined/sub-sub-group',
        ]);
        expect(tree[1].children).toEqual([]);
    });

    it('does not nest an image under an image', async () => {
        const tree = await scanDirectoryTree('test/data/scan-cases/nested-image');

        expect(tree).toHaveLength(1);
        expect(tree[0].path).toBe('group');
        expect(tree[0].children.map((item) => item.path)).toEqual([
            'group/inner',
            'group/outer',
        ]);
        expect(tree[0].children.every((item) => item.children.length === 0)).toBe(true);
    });

    it('contains every flat item exactly once', async () => {
        for (const dir of ['test/data/scan', 'test/data/scan-cases/nested-image', 'test/data/scan-cases/plain-top']) {
            const flat = await scanDirectory(dir);
            const expected = [...flat.images, ...flat.groups].map((item) => item.path).sort();

            expect(flatten(await scanDirectoryTree(dir)).sort()).toEqual(expected);
        }
    });

    it('surfaces validator errors as ScanValidationError', async () => {
        await expect(scanDirectoryTree('test/data/scan', {
            validate: {
                image: () => {
                    throw new Error('bad');
                },
            },
        })).rejects.toBeInstanceOf(ScanValidationError);
    });

    it('validates each item once', async () => {
        const seen : string[] = [];

        await scanDirectoryTree('test/data/scan', {
            validate: {
                image: (attributes, item) => {
                    seen.push(item.path);
                    return attributes;
                },
                group: (attributes, item) => {
                    seen.push(item.path);
                    return attributes;
                },
            },
        });

        expect(seen.length).toBeGreaterThan(0);
        expect(seen.length).toBe(new Set(seen).size);
    });

    it('matches the flat scan for siblings sharing a virtual path', async () => {
        const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'docken-tree-'));

        try {
            await fs.mkdir(path.join(tmp, 'g', 'a', 'shared'), { recursive: true });
            await fs.mkdir(path.join(tmp, 'g', 'b', 'shared'), { recursive: true });
            await fs.writeFile(path.join(tmp, 'g', 'image-group.json'), '{}');
            await fs.writeFile(path.join(tmp, 'g', 'a', 'shared', 'Dockerfile'), 'FROM scratch\n');
            await fs.writeFile(path.join(tmp, 'g', 'b', 'shared', 'Dockerfile'), 'FROM scratch\n');

            const flat = await scanDirectory(tmp);
            const tree = await scanDirectoryTree(tmp);

            // item paths are real paths, so both stay (virtualPath g/shared)
            expect(tree[0].children.map((item) => [item.path, item.virtualPath])).toEqual([
                ['g/a/shared', 'g/shared'],
                ['g/b/shared', 'g/shared'],
            ]);
            expect(flatten(tree).sort()).toEqual([...flat.images, ...flat.groups].map((item) => item.path).sort());
        } finally {
            await fs.rm(tmp, { recursive: true, force: true });
        }
    });
});
