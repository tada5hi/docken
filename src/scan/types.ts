/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ScanResultItem } from './result';

export type ScanResult<
    TImage = Record<string, any>,
    TGroup = Record<string, any>,
> = {
    groups: ScanResultItem<TGroup>[],
    images: ScanResultItem<TImage>[]
};

export type ScanOptions<
    TImage = Record<string, any>,
    TGroup = Record<string, any>,
> = {
    /**
     * Directory base names to skip (default: ['.git', 'node_modules']).
     * Passing it replaces the default.
     */
    ignore?: string[],
    /**
     * Maximum depth, the root is 0 (default: unlimited).
     */
    maxDepth?: number,
    validate?: {
        image?: (
            attributes: Record<string, any> | undefined,
            item: ScanResultItem,
        ) => TImage | Promise<TImage>,
        group?: (
            attributes: Record<string, any> | undefined,
            item: ScanResultItem,
        ) => TGroup | Promise<TGroup>,
    },
};
