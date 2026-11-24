/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Rejection of a modem stream, carrying the last lines of its textual output.
 */
export class ModemStreamError extends Error {
    readonly output: string[];

    constructor(message: string, options: { output: string[], cause?: unknown }) {
        super(message, { cause: options.cause });

        this.name = 'ModemStreamError';
        this.output = options.output;
    }
}

export function isModemStreamError(input: unknown): input is ModemStreamError {
    if (input instanceof ModemStreamError) {
        return true;
    }

    // a second module copy (CJS + ESM) fails instanceof
    return typeof input === 'object' &&
        input !== null &&
        (input as { name?: unknown }).name === 'ModemStreamError' &&
        Array.isArray((input as { output?: unknown }).output) &&
        (input as { output: unknown[] }).output.every((line) => typeof line === 'string');
}
