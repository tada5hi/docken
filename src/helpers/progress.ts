import type { Progress } from './types';
/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildProgress(current: number, total: number): Progress {
    return {
        current,
        total,
        percent: Math.floor((current / total) * 100),
    };
}

// Retain types imported from the existing declaration path.
// eslint-disable-next-line @tada5hi/no-reexport-shims -- Preserve the published declaration import path.
export type { Progress } from './types';
