/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MetaType } from './meta';
import type { ScanOptions, ScanResult } from './types';
import { foldScanTree, walkDirectory } from './tree';
import { validateScanItems } from './validate';

export async function scanDirectory<
    TImage = Record<string, any>,
    TGroup = Record<string, any>,
>(
    cwd: string,
    options: ScanOptions<TImage, TGroup> = {},
) : Promise<ScanResult<TImage, TGroup>> {
    const result = foldScanTree(await walkDirectory(cwd, {
        ignore: options.ignore,
        maxDepth: options.maxDepth,
    }));

    return {
        images: await validateScanItems<TImage>(result.images, MetaType.IMAGE, options.validate?.image),
        groups: await validateScanItems<TGroup>(result.groups, MetaType.GROUP, options.validate?.group),
    };
}
