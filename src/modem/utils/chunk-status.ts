import type {
    ModemDownloadingStatusChunk,
    ModemExtractingStatusChunk,
    ModemGenericStatusChunk,
    ModemPushingStatusChunk,
    ModemStatusChunk,
} from './types';
/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';

export function isModemStatusChunk(input: unknown) : input is ModemStatusChunk {
    if (!isObject(input) || (typeof input.status !== 'string')) {
        return false;
    }

    if (typeof input.id !== 'string' && typeof input.id !== 'undefined') {
        return false;
    }

    if (typeof input.progress !== 'string' && typeof input.progress !== 'undefined') {
        return false;
    }

    return isObject(input.progressDetail) || typeof input.progressDetail === 'undefined';
}

export function isModemDownloadingStatusChunk(input: ModemGenericStatusChunk) : input is ModemDownloadingStatusChunk {
    return input.status === 'Downloading' && isObject(input.progressDetail);
}

export function isModemExtractingStatusChunk(input: ModemGenericStatusChunk) : input is ModemExtractingStatusChunk {
    return input.status === 'Extracting' && isObject(input.progressDetail);
}

export function isModemPushingStatusChunk(input: ModemGenericStatusChunk) : input is ModemPushingStatusChunk {
    return input.status === 'Pushing' && isObject(input.progressDetail);
}

// Retain types imported from the existing declaration path.
// eslint-disable-next-line @tada5hi/no-reexport-shims -- Preserve the published declaration import path.
export type {
    ModemStatusChunkDetail,
    ModemGenericStatusChunk,
    ModemExtractingStatusChunk,
    ModemPushingStatusChunk,
    ModemDownloadingStatusChunk,
    ModemWaitingStatusChunk,
    ModemPushedStatusChunk,
    ModemPullCompleteStatusChunk,
    ModemStatusChunk,
} from './types';
