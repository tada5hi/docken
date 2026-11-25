/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { MetaType } from './meta';
import type { ScanOptions, ScanResult } from './types';
import { foldScanTree, foldScanTreeItems, walkDirectory } from './tree';
import type { ScanTreeItem } from './tree';
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

async function validateTreeItems<TImage, TGroup>(
    items: ScanTreeItem[],
    options: ScanOptions<TImage, TGroup>,
) : Promise<ScanTreeItem<TImage | TGroup>[]> {
    const output : ScanTreeItem<TImage | TGroup>[] = [];

    for (const item of items) {
        const {
            type, 
            children, 
            ...flat 
        } = item;

        const [validated] = type === MetaType.GROUP ?
            await validateScanItems<TGroup>([flat], type, options.validate?.group) :
            await validateScanItems<TImage>([flat], type, options.validate?.image);

        output.push({
            ...validated,
            type,
            children: await validateTreeItems(children, options),
        });
    }

    return output;
}

export async function scanDirectoryTree<
    TImage = Record<string, any>,
    TGroup = Record<string, any>,
>(
    cwd: string,
    options: ScanOptions<TImage, TGroup> = {},
) : Promise<ScanTreeItem<TImage | TGroup>[]> {
    const items = foldScanTreeItems(await walkDirectory(cwd, {
        ignore: options.ignore,
        maxDepth: options.maxDepth,
    }));

    return validateTreeItems(items, options);
}
