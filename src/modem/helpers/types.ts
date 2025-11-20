/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Progress } from '../../helpers';
import type { ObjectLiteral, Quantity } from '../../types';
import type { ModemStatusChunk, ModemStreamChunk } from '../utils';

export {
    ModemStatusChunk,
    ModemStreamChunk,
};

export type ModemOnFinishedFn = () => void | Promise<void>;
export type ModemOnChunkFn = (input: ObjectLiteral) => void | Promise<void>;
export type ModemOnStreamChunkFn = (input: ModemStreamChunk) => void | Promise<void>;
export type ModemOnStatusChunkFn = (input: ModemStatusChunk) => void | Promise<void>;
export type ModemOnProgressFn = (input: Progress) => void | Promise<void>;
export type ModemOnQuantityFn = (quantity: Quantity) => void | Promise<void>;

export type ModemStreamWaitOptions = {
    onFinished?: ModemOnFinishedFn,
    onChunk?: ModemOnChunkFn,
    onStreamChunk?: ModemOnStreamChunkFn,
    onStatusChunk?: ModemOnStatusChunkFn,

    onPushing?: ModemOnProgressFn,
    onDownloading?: ModemOnProgressFn,
    onExtracting?: ModemOnQuantityFn,
    onBuilding?: ModemOnProgressFn,
};
