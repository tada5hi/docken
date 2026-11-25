/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ModemStreamError } from './error';

/**
 * Combine an abort signal and a timeout (ms) into one signal.
 * A timeout that is not a positive finite number is ignored.
 */
export function createAbortSignal(
    options: { signal?: AbortSignal, timeout?: number },
) : AbortSignal | undefined {
    const signals : AbortSignal[] = [];

    if (options.signal) {
        signals.push(options.signal);
    }

    if (
        typeof options.timeout === 'number' &&
        Number.isFinite(options.timeout) &&
        options.timeout > 0
    ) {
        signals.push(AbortSignal.timeout(Math.min(Math.ceil(options.timeout), 2 ** 31 - 1)));
    }

    if (signals.length === 0) {
        return undefined;
    }

    if (signals.length === 1) {
        return signals[0];
    }

    return AbortSignal.any(signals);
}

export function createModemStreamAbortError(reason: unknown, output: string[]) : ModemStreamError {
    const timedOut = Error.isError(reason) && reason.name === 'TimeoutError';

    return new ModemStreamError(
        timedOut ? 'The stream timed out.' : 'The stream was aborted.',
        {
            output,
            cause: reason,
            aborted: true,
        },
    );
}
