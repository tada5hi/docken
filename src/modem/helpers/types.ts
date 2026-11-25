/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ModemStreamEvent } from '../reader';
import type { Progress } from '../../helpers';
import type { ObjectLiteral, Quantity } from '../../types';
import type { ModemStatusChunk, ModemStreamChunk } from '../utils';

export type {
    ModemStatusChunk,
    ModemStreamChunk,
};

export type ModemOnFinishedFn = () => void | Promise<void>;
export type ModemOnChunkFn = (input: ObjectLiteral) => void | Promise<void>;
export type ModemOnStreamChunkFn = (input: ModemStreamChunk) => void | Promise<void>;
export type ModemOnStatusChunkFn = (input: ModemStatusChunk) => void | Promise<void>;
export type ModemOnProgressFn = (input: Progress) => void | Promise<void>;
export type ModemOnQuantityFn = (quantity: Quantity) => void | Promise<void>;

export type ModemOnEventFn = (event: ModemStreamEvent) => void | Promise<void>;

export type ModemStreamWaitOptions = {
    onFinished?: ModemOnFinishedFn,
    onChunk?: ModemOnChunkFn,
    onStreamChunk?: ModemOnStreamChunkFn,
    onStatusChunk?: ModemOnStatusChunkFn,

    onPushing?: ModemOnProgressFn,
    onDownloading?: ModemOnProgressFn,
    onExtracting?: ModemOnQuantityFn,
    onBuilding?: ModemOnProgressFn,
    onDownloadingTotal?: ModemOnProgressFn,
    onPushingTotal?: ModemOnProgressFn,

    /**
     * Called for every stream event, before the callback specific to it,
     * also for events after the one that handled the chunk.
     */
    onEvent?: ModemOnEventFn,

    /**
     * Pass a stream chunk on to onStreamChunk / onChunk even when every line
     * it completed is a build step already reported to onBuilding.
     * Set to false to receive such chunks only through onBuilding.
     *
     * @default true
     */
    streamBuildSteps?: boolean,

    /**
     * Abort the wait: the stream is destroyed and the promise rejects
     * with a ModemStreamError (aborted: true).
     */
    signal?: AbortSignal,

    /**
     * Abort the wait after this many milliseconds.
     * Values <= 0 or non-finite are ignored.
     */
    timeout?: number,
};
