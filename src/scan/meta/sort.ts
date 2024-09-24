import path from 'node:path';
import type { Meta } from './types';

function sorter(a: string[], b: string[]) {
    const l = Math.max(a.length, b.length);
    for (let i = 0; i < l; i += 1) {
        if (!(i in a)) return -1;
        if (!(i in b)) return +1;
        if (a[i].toUpperCase() > b[i].toUpperCase()) return +1;
        if (a[i].toUpperCase() < b[i].toUpperCase()) return -1;
        if (a.length < b.length) return -1;
        if (a.length > b.length) return +1;
    }

    return 0;
}

export function sortMetaElementsByPath(meta: Meta[]) {
    return meta.sort((a, b) => {
        const aParts = a.path.split(path.sep);
        const bParts = b.path.split(path.sep);

        return sorter(aParts, bParts);
    });
}
