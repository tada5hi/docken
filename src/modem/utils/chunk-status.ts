/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';

export type ModemStatusChunkDetail = {
    current: number,
    total: number,
    hidecounts: boolean,
    units: string
};

export type ModemGenericStatusChunk = {
    status: string,
    progressDetail?: Partial<ModemStatusChunkDetail>,
    progress?: string,
    id: string
};

export type ModemExtractingStatusChunk = {
    status: 'Extracting',
    progressDetail: Pick<ModemStatusChunkDetail, 'current' | 'units'>,
    progress: string,
    id: string
};

export type ModemPushingStatusChunk = {
    status: 'Pushing',
    progressDetail: Pick<ModemStatusChunkDetail, 'current' | 'total'>,
    progress: string,
    id: string
};

export type ModemDownloadingStatusChunk = {
    status: 'Downloading',
    progressDetail: Pick<ModemStatusChunkDetail, 'current' | 'total'>,
    progress: string,
    id: string
};

export type ModemWaitingStatusChunk = {
    status: 'Waiting',
    id: string
};

export type ModemPushedStatusChunk = {
    status: 'Pushed',
    id: string
};

export type ModemPullCompleteStatusChunk = {
    status: 'Pull complete',
    progressDetail: Pick<ModemStatusChunkDetail, 'hidecounts'>,
    id: string
};

export type ModemStatusChunk = ModemGenericStatusChunk |
ModemPushingStatusChunk |
ModemDownloadingStatusChunk |
ModemExtractingStatusChunk |
ModemWaitingStatusChunk |
ModemPushedStatusChunk |
ModemPullCompleteStatusChunk;

export function isModemStatusChunk(input: unknown) : input is ModemStatusChunk {
    if (!isObject(input)) return false;

    if (typeof input.status !== 'string') {
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
