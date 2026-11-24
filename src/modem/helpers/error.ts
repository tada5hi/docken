/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';

/**
 * Rejection of a modem stream, carrying every line of its textual output.
 * `output` is non-enumerable so loggers and serializers do not dump it.
 */
export class ModemStreamError extends Error {
    declare readonly output: string[];

    readonly code?: string;

    readonly errno?: number;

    readonly syscall?: string;

    readonly statusCode?: number;

    constructor(message: string, options: { output: string[], cause?: unknown }) {
        super(message, { cause: options.cause });

        this.name = 'ModemStreamError';
        Object.defineProperty(this, 'output', {
            value: options.output,
            enumerable: false,
            writable: false,
            configurable: true,
        });

        const { cause } = options;

        if (!isObject(cause)) {
            return;
        }

        if (hasOwnProperty(cause, 'code') && typeof cause.code === 'string') {
            this.code = cause.code;
        }

        if (hasOwnProperty(cause, 'errno') && typeof cause.errno === 'number') {
            this.errno = cause.errno;
        }

        if (hasOwnProperty(cause, 'syscall') && typeof cause.syscall === 'string') {
            this.syscall = cause.syscall;
        }

        if (hasOwnProperty(cause, 'statusCode') && typeof cause.statusCode === 'number') {
            this.statusCode = cause.statusCode;
        }
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
