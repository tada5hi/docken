/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';
import type { MetaType } from './meta';

/**
 * Rejection of a scan whose item failed attribute validation.
 * `cause` is the error thrown by the validator.
 */
export class ScanValidationError extends Error {
    readonly path: string;

    readonly type: MetaType;

    constructor(options: {
        path: string, 
        type: MetaType, 
        cause?: unknown 
    }) {
        super(`The ${options.type} at ${options.path} has invalid attributes.`, { cause: options.cause });

        this.name = 'ScanValidationError';
        this.path = options.path;
        this.type = options.type;
    }
}

export function isScanValidationError(input: unknown): input is ScanValidationError {
    if (input instanceof ScanValidationError) {
        return true;
    }

    // a second module copy (another installed version) fails instanceof
    return isObject(input) &&
        hasOwnProperty(input, 'name') &&
        input.name === 'ScanValidationError' &&
        hasOwnProperty(input, 'path') &&
        typeof input.path === 'string';
}
