/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type WaitForDaemonOptions = {
    /**
     * Retries after the first failed ping.
     * @default 10
     */
    retries?: number,
    /**
     * Milliseconds between pings.
     * @default 1000
     */
    interval?: number,
    signal?: AbortSignal,
};
