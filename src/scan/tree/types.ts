/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DirectoryMeta } from '../meta';

export type ScanNode = {
    /**
     * Directory base name.
     */
    name: string,
    /**
     * Meta of the directory, if it contains one.
     */
    meta?: DirectoryMeta,
    /**
     * Sub-directories, in opendir order.
     */
    children: ScanNode[],
};

export type WalkOptions = {
    /**
     * Directory base names to skip (default: ['.git', 'node_modules']).
     * The root is always walked.
     */
    ignore?: string[],
    /**
     * Maximum depth, the root is 0 (default: unlimited).
     */
    maxDepth?: number,
};
