/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Progress } from '../../helpers';
import type { Quantity } from '../../types';
import type { ModemStatusChunk, ModemStreamChunk } from '../utils';

/**
 * A build step started or ended in the text of a stream chunk.
 */
export type ModemStreamBuildingEvent = {
    kind: 'building',
    progress: Progress,
};

export type ModemStreamDownloadingEvent = {
    kind: 'downloading',
    progress: Progress,
    chunk: ModemStatusChunk,
};

export type ModemStreamPushingEvent = {
    kind: 'pushing',
    progress: Progress,
    chunk: ModemStatusChunk,
};

export type ModemStreamExtractingEvent = {
    kind: 'extracting',
    quantity: Quantity,
    chunk: ModemStatusChunk,
};

/**
 * A status chunk without a more specific kind.
 */
export type ModemStreamStatusEvent = {
    kind: 'status',
    chunk: ModemStatusChunk,
};

/**
 * The text of a stream chunk.
 */
export type ModemStreamOutputEvent = {
    kind: 'output',
    chunk: ModemStreamChunk,
    /**
     * Every line the chunk completed was a build step, so the chunk
     * carries nothing beyond its building events.
     */
    onlyBuildSteps: boolean,
};

export type ModemStreamEvent = ModemStreamBuildingEvent |
    ModemStreamDownloadingEvent |
    ModemStreamPushingEvent |
    ModemStreamExtractingEvent |
    ModemStreamStatusEvent |
    ModemStreamOutputEvent;
