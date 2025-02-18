/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {Meta} from "../../../src";
import { scanDirectory } from "../../../src";
import * as path from "path";

describe('src/api/sort.ts', () => {
    it('should scan directory correctly', async () => {
        const directory = await scanDirectory('test/data');
        expect(directory.images).toEqual([
            {
                path: `group${path.sep}image`,
                virtualPath: 'group/image',
                attributes: {
                    name: 'Cool image',
                }
            },
            {
                path: `group${path.sep}undefined${path.sep}sub-sub-group${path.sep}image`,
                virtualPath: 'group/sub-sub-group/image',
                attributes: {
                    id: 'meta-id',
                    name: 'MetaId',
                }
            },
            {
                path: 'image',
                virtualPath: 'image'
            },
        ] as Meta[]);

        expect(directory.groups).toEqual([
            {
                path: 'group',
                virtualPath: 'group',
                attributes: {
                    license: 'MIT',
                    name: 'Group',
                }
            },
            {
                path: `group${path.sep}sub-group`,
                virtualPath: 'group/sub-group',
                attributes: {
                    name: 'SubGroup',
                }
            },
            {
                path: `group${path.sep}undefined${path.sep}sub-sub-group`,
                virtualPath: 'group/sub-sub-group',
                attributes: {
                    name: 'SubSubGroup',
                }
            }
        ] as Meta[])
    });
});
