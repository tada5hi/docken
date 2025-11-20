/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { Progress } from '../../helpers';
import { buildProgress } from '../../helpers';

export type ModemStreamChunk = {
    stream: string,
};

export function isModemProgressStream(input: unknown) : input is ModemStreamChunk {
    return isObject(input) && typeof input.stream === 'string';
}

export function parseModemProgressStreamAsStepStart(input: ModemStreamChunk) : Progress | undefined {
    const matches = input.stream.match(/^Step\s([0-9])\/([0-9])\s:.*/s);
    if (!matches) {
        return undefined;
    }

    const current = parseInt(matches[1], 10);
    const total = parseInt(matches[2], 10);

    return buildProgress((current * 2) - 1, total * 2);
}

export function isModemProgressStreamEndStep(input: ModemStreamChunk) : boolean {
    return !!input.stream.match(/^ ---> [a-z0-9]+\n$/);
}
