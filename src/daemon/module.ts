/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { setTimeout as sleep } from 'node:timers/promises';
import type { Client } from '../client/types';
import type { WaitForDaemonOptions } from './types';

export async function waitForDaemon(
    client: Pick<Client, 'ping'>,
    options: WaitForDaemonOptions = {},
): Promise<void> {
    const retries = options.retries ?? 10;
    const interval = options.interval ?? 1000;

    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        if (options.signal?.aborted) {
            throw options.signal.reason;
        }

        try {
            await client.ping();

            return;
        } catch (e) {
            lastError = e;
        }

        if (attempt < retries) {
            try {
                await sleep(interval, undefined, { signal: options.signal });
            } catch (e) {
                // node rejects with an AbortError; surface the signal reason instead
                if (options.signal?.aborted) {
                    throw options.signal.reason;
                }

                throw e;
            }
        }
    }

    throw new Error('The docker daemon is not reachable.', { cause: lastError });
}
