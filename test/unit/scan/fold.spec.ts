/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { MetaType } from '../../../src/scan/meta';
import type { ScanNode } from '../../../src/scan/tree';
import { foldScanTree } from '../../../src/scan/tree';

describe('foldScanTree', () => {
    it('nests an image in an image without the outer image name', () => {
        const root: ScanNode = {
            name: 'nested-image',
            children: [{
                name: 'group',
                meta: { type: MetaType.GROUP, attributes: { name: 'Group', license: 'MIT' } },
                children: [{
                    name: 'outer',
                    meta: { type: MetaType.IMAGE, attributes: { name: 'Outer' } },
                    children: [{
                        name: 'inner',
                        meta: { type: MetaType.IMAGE },
                        children: [],
                    }],
                }],
            }],
        };

        expect(foldScanTree(root)).toEqual({
            images: [
                {
                    virtualPath: 'group/inner',
                    path: 'group/inner',
                    attributes: { name: 'Group', license: 'MIT' },
                },
                {
                    virtualPath: 'group/outer',
                    path: 'group/outer',
                    attributes: { name: 'Outer', license: 'MIT' },
                },
            ],
            groups: [
                {
                    virtualPath: 'group',
                    path: 'group',
                    attributes: { name: 'Group', license: 'MIT' },
                },
            ],
        });
    });

    it('adds plain directories to path but not to virtualPath', () => {
        const root: ScanNode = {
            name: 'plain-top',
            children: [{
                name: 'plain',
                children: [
                    {
                        name: 'deeper',
                        children: [{
                            name: 'nested',
                            meta: { type: MetaType.IMAGE },
                            children: [],
                        }],
                    },
                    {
                        name: 'group',
                        meta: { type: MetaType.GROUP, attributes: { name: 'Group', license: 'MIT' } },
                        children: [{
                            name: 'base',
                            meta: { type: MetaType.IMAGE },
                            children: [],
                        }],
                    },
                ],
            }],
        };

        expect(foldScanTree(root)).toEqual({
            images: [
                {
                    virtualPath: 'nested',
                    path: 'plain/deeper/nested',
                },
                {
                    virtualPath: 'group/base',
                    path: 'plain/group/base',
                    attributes: { name: 'Group', license: 'MIT' },
                },
            ],
            groups: [
                {
                    virtualPath: 'group',
                    path: 'plain/group',
                    attributes: { name: 'Group', license: 'MIT' },
                },
            ],
        });
    });

    it('includes a root directory that has its own meta file', () => {
        const root: ScanNode = {
            name: 'root-group',
            meta: { type: MetaType.GROUP, attributes: { name: 'Root' } },
            children: [
                {
                    name: 'child',
                    meta: { type: MetaType.IMAGE },
                    children: [],
                },
                {
                    name: 'folder',
                    children: [{
                        name: 'sub',
                        meta: { type: MetaType.GROUP, attributes: { name: 'Sub' } },
                        children: [{
                            name: 'leaf',
                            meta: { type: MetaType.IMAGE },
                            children: [],
                        }],
                    }],
                },
            ],
        };

        expect(foldScanTree(root)).toEqual({
            images: [
                {
                    virtualPath: 'root-group/child',
                    path: 'root-group/child',
                    attributes: { name: 'Root' },
                },
                {
                    virtualPath: 'root-group/sub/leaf',
                    path: 'root-group/folder/sub/leaf',
                    attributes: { name: 'Sub' },
                },
            ],
            groups: [
                {
                    virtualPath: 'root-group',
                    path: 'root-group',
                    attributes: { name: 'Root' },
                },
                {
                    virtualPath: 'root-group/sub',
                    path: 'root-group/folder/sub',
                    attributes: { name: 'Sub' },
                },
            ],
        });
    });

    it('keeps attributes undefined for a Dockerfile-only image without a group', () => {
        const root: ScanNode = {
            name: 'r',
            children: [{
                name: 'image',
                meta: { type: MetaType.IMAGE },
                children: [],
            }],
        };

        expect(foldScanTree(root)).toEqual({
            images: [{ virtualPath: 'image', path: 'image' }],
            groups: [],
        });
    });

    it('lets own attributes override inherited ones', () => {
        const root: ScanNode = {
            name: 'r',
            children: [{
                name: 'g',
                meta: { type: MetaType.GROUP, attributes: { name: 'G', license: 'MIT' } },
                children: [{
                    name: 'i',
                    meta: { type: MetaType.IMAGE, attributes: { name: 'I' } },
                    children: [],
                }],
            }],
        };

        expect(foldScanTree(root).images[0].attributes).toEqual({ name: 'I', license: 'MIT' });
    });

    it('copies, not shares, inherited attributes', () => {
        const root: ScanNode = {
            name: 'r',
            children: [{
                name: 'g',
                meta: { type: MetaType.GROUP, attributes: { name: 'G' } },
                children: [{
                    name: 'i',
                    meta: { type: MetaType.IMAGE },
                    children: [],
                }],
            }],
        };

        const result = foldScanTree(root);

        result.images[0].attributes!.name = 'changed';

        expect(result.groups[0].attributes).toEqual({ name: 'G' });
    });

    it('keeps empty own attributes', () => {
        const root: ScanNode = {
            name: 'r',
            children: [{
                name: 'image',
                meta: { type: MetaType.IMAGE, attributes: {} },
                children: [],
            }],
        };

        expect(foldScanTree(root)).toStrictEqual({
            images: [{
                virtualPath: 'image',
                path: 'image',
                attributes: {},
            }],
            groups: [],
        });
    });
});
