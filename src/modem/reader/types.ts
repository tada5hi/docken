/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Progress } from '../../helpers';
import type { ObjectLiteral, Quantity } from '../../types';

export type ModemStreamStatusEvent = {
    kind: 'downloading',
    progress: Progress
} | {
    kind: 'pushing',
    progress: Progress
} | {
    kind: 'extracting',
    quantity: Quantity
} | {
    kind: 'other'
};

export type ModemStreamEvent = {
    chunk: ObjectLiteral,
    /**
     * Set when the chunk is a status chunk.
     */
    status?: ModemStreamStatusEvent,
    /**
     * Set when the chunk is a progress stream chunk.
     */
    stream?: {
        building: Progress[],
        /**
         * building.length > 0 and every line the chunk completed was a building event.
         */
        buildOnly: boolean,
    },
};
