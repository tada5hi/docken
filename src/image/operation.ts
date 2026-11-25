/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import { waitForStream } from '../client';
import type { ModemStreamEvent, ModemStreamWaitOptions } from '../modem';
import {
    createAbortSignal,
    createModemStreamAbortError,
    isModemStreamError,
} from '../modem';

/**
 * Start an image operation and wait for its stream.
 * The combined signal/timeout also covers the request phase (via start).
 */
export async function runImageOperation(
    client: Client,
    start: (abortSignal?: AbortSignal) => Promise<NodeJS.ReadableStream>,
    options: ModemStreamWaitOptions | undefined,
    collect: (event: ModemStreamEvent) => void,
) : Promise<void> {
    const {
        signal: _signal,
        timeout: _timeout,
        ...rest
    } = options || {};
    const signal = createAbortSignal({ signal: options?.signal, timeout: options?.timeout });

    try {
        const stream = await start(signal);

        await waitForStream(client, stream, {
            ...rest,
            signal,
            onEvent: async (event) => {
                collect(event);

                if (options?.onEvent) {
                    await options.onEvent(event);
                }
            },
        });
    } catch (e) {
        if (signal?.aborted && !isModemStreamError(e)) {
            throw createModemStreamAbortError(signal.reason, []);
        }

        throw e;
    }
}
