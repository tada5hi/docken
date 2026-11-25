/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, isObject } from 'smob';
import type { ObjectLiteral } from '../../types';

export function extractErrorFromModemResponse(res: unknown) : (Error & { detail: ObjectLiteral }) | null {
    if (!res || !Array.isArray(res) || res.length === 0) {
        return null;
    }

    const raw = res[res.length - 1];

    if (
        isObject(raw) &&
        hasOwnProperty(raw, 'errorDetail') &&
        isObject(raw.errorDetail)
    ) {
        let message : string;

        if (typeof raw.errorDetail.message === 'string') {
            message = raw.errorDetail.message;
        } else {
            message = 'An unknown client modem error occurred.';
        }

        return Object.assign(new Error(message), { detail: raw.errorDetail as ObjectLiteral });
    }

    return null;
}
