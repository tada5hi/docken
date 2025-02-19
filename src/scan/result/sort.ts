/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { ScanResultItem } from './types';

function sorter(a: string[], b: string[]) {
    const l = Math.max(a.length, b.length);
    for (let i = 0; i < l; i += 1) {
        if (!(i in a)) return -1;
        if (!(i in b)) return +1;
        if (a[i].toUpperCase() > b[i].toUpperCase()) return +1;
        if (a[i].toUpperCase() < b[i].toUpperCase()) return -1;
    }

    if (a.length < b.length) return -1;
    if (a.length > b.length) return +1;

    return 0;
}

export function sortScanResultItemsByPath(meta: ScanResultItem[]) {
    return meta.sort((a, b) => {
        const aParts = a.path.split(path.sep);
        const bParts = b.path.split(path.sep);

        return sorter(aParts, bParts);
    });
}
