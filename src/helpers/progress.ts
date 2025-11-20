/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Progress = {
    current: number,
    total: number,
    percent: number,
};

export function buildProgress(current: number, total: number): Progress {
    return {
        current,
        total,
        percent: Math.floor((current / total) * 100),
    };
}
