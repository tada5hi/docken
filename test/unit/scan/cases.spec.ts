/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { scanDirectory } from '../../../src';

describe('scan cases', () => {
    it('nests an image in an image without the outer image name', async () => {
        const result = await scanDirectory('test/data/scan-cases/nested-image');

        expect(result).toEqual({
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

    it('adds plain directories to path but not to virtualPath', async () => {
        const result = await scanDirectory('test/data/scan-cases/plain-top');

        expect(result).toEqual({
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

    it('includes a root directory that has its own meta file', async () => {
        const result = await scanDirectory('test/data/scan-cases/root-group');

        expect(result).toEqual({
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

    it('prefers image.json over image-group.json over a Dockerfile', async () => {
        const result = await scanDirectory('test/data/scan-cases/precedence');

        expect(result).toEqual({
            images: [
                {
                    virtualPath: 'both-files',
                    path: 'both-files',
                    attributes: { name: 'Image' },
                },
                {
                    virtualPath: 'group-with-dockerfile/child',
                    path: 'group-with-dockerfile/child',
                    attributes: { name: 'GroupDockerfile' },
                },
            ],
            groups: [
                {
                    virtualPath: 'group-with-dockerfile',
                    path: 'group-with-dockerfile',
                    attributes: { name: 'GroupDockerfile' },
                },
            ],
        });
    });

    it('rejects a meta file that is not a JSON object', async () => {
        await expect(scanDirectory('test/data/scan-cases/invalid'))
            .rejects.toThrow('The file content could not be read.');
    });
});
