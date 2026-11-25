/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import { waitForStream } from '../client';
import type { ModemStreamEvent, ModemStreamWaitOptions } from '../modem';
import { isModemStreamError } from '../modem';
import { createAbortSignal, createModemStreamAbortError } from '../modem/helpers/abort';

function destroyStream(stream: NodeJS.ReadableStream) {
    (stream as { destroy?: () => void }).destroy?.();
}

/**
 * Settle with start(), or reject with the abort reason as soon as the
 * signal aborts. A stream that start() resolves after the abort is destroyed.
 */
function raceAbort(
    start: Promise<NodeJS.ReadableStream>,
    signal: AbortSignal | undefined,
) : Promise<NodeJS.ReadableStream> {
    if (!signal) {
        return start;
    }

    return new Promise((resolve, reject) => {
        const onAbort = () => reject(signal.reason);

        signal.addEventListener('abort', onAbort, { once: true });

        start.then(
            (stream) => {
                signal.removeEventListener('abort', onAbort);

                if (signal.aborted) {
                    destroyStream(stream);
                    reject(signal.reason);

                    return;
                }

                resolve(stream);
            },
            (error) => {
                signal.removeEventListener('abort', onAbort);
                reject(error);
            },
        );
    });
}

/**
 * Start an image operation and wait for its stream.
 * The combined signal/timeout covers the whole operation: preparation
 * and request (start) as well as the stream.
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
        signal?.throwIfAborted();

        const stream = await raceAbort(start(signal), signal);

        await waitForStream(client, stream, {
            ...rest,
            signal,
            onEvent: (event) => {
                collect(event);

                return options?.onEvent?.(event);
            },
        });
    } catch (e) {
        if (signal?.aborted && !isModemStreamError(e)) {
            throw createModemStreamAbortError(signal.reason, []);
        }

        throw e;
    }
}
