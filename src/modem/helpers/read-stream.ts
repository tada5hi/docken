/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Modem } from '../types';
import type { ModemStreamEvent } from '../reader';
import type { ModemStreamReadOptions } from './types';
import { waitForModemStream } from './wait-for-stream';

/**
 * Iterate over the events of a modem stream.
 * Ends on success, throws the ModemStreamError on failure or abort.
 * Breaking out of the loop early destroys the stream.
 * Events are buffered without limit while the consumer is busy.
 */
export async function* readModemStream(
    modem: Pick<Modem, 'followProgress'>,
    stream: NodeJS.ReadableStream,
    options: ModemStreamReadOptions = {},
): AsyncGenerator<ModemStreamEvent, void, undefined> {
    const queue: ModemStreamEvent[] = [];
    let waiter: PromiseWithResolvers<void> | undefined;
    let settled = false;
    let failure: { error: unknown } | undefined;

    const notify = () => {
        const current = waiter;

        waiter = undefined;

        if (current) {
            current.resolve();
        }
    };

    waitForModemStream(modem, stream, {
        signal: options.signal,
        timeout: options.timeout,
        onEvent: (event) => {
            queue.push(event);
            notify();
        },
    }).then(
        () => {
            settled = true;
            notify();
        },
        (error) => {
            settled = true;
            failure = { error };
            notify();
        },
    );

    try {
        while (true) {
            const event = queue.shift();

            if (event) {
                yield event;

                continue;
            }

            if (settled) {
                break;
            }

            waiter = Promise.withResolvers<void>();
            await waiter.promise;
        }

        if (failure) {
            throw failure.error;
        }
    } finally {
        if (!settled) {
            const { destroy } = stream as { destroy?: unknown };

            if (typeof destroy === 'function') {
                destroy.call(stream);
            }
        }
    }
}
