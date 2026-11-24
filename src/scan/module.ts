/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ScanResult } from './types';
import { foldScanTree, walkDirectory } from './tree';

export async function scanDirectory(
    cwd: string,
) : Promise<ScanResult> {
    return foldScanTree(await walkDirectory(cwd));
}
