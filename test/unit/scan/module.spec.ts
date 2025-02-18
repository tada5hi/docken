/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { Meta } from '../../../src';
import { scanDirectory } from '../../../src';

describe('scan', () => {
    it('should scan directory correctly', async () => {
        const directory = await scanDirectory('test/data');
        expect(directory.images).toEqual([
            {
                path: `group${path.sep}image`,
                virtualPath: 'group/image',
                attributes: {
                    license: 'MIT',
                    name: 'Cool image',
                },
            },
            {
                path: `group${path.sep}undefined${path.sep}sub-sub-group${path.sep}image`,
                virtualPath: 'group/sub-sub-group/image',
                attributes: {
                    license: 'MIT',
                    id: 'meta-id',
                    name: 'MetaId',
                },
            },
            {
                path: 'image',
                virtualPath: 'image',
            },
        ] as Meta[]);

        expect(directory.groups).toEqual([
            {
                path: 'group',
                virtualPath: 'group',
                attributes: {
                    license: 'MIT',
                    name: 'Group',
                },
            },
            {
                path: `group${path.sep}sub-group`,
                virtualPath: 'group/sub-group',
                attributes: {
                    license: 'MIT',
                    name: 'SubGroup',
                },
            },
            {
                path: `group${path.sep}undefined${path.sep}sub-sub-group`,
                virtualPath: 'group/sub-sub-group',
                attributes: {
                    license: 'MIT',
                    name: 'SubSubGroup',
                },
            },
        ] as Meta[]);
    });
});
