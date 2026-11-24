/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';

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
    return isObject(input) &&
        hasOwnProperty(input, 'name') &&
        input.name === 'ModemStreamError' &&
        hasOwnProperty(input, 'output') &&
        Array.isArray(input.output) &&
        input.output.every((line) => typeof line === 'string');
}
