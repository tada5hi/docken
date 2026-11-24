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
