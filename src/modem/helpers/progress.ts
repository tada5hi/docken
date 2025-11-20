/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';

export type ModemProgressDetail = {
    current: number,
    total: number,
    hidecounts: boolean,
    units: string
};

export type ModemGenericProgress = {
    status: string,
    progressDetail?: Partial<ModemProgressDetail>,
    progress?: string,
    id: string
};

export type ModemExtractingProgress = {
    status: 'Extracting',
    progressDetail: Pick<ModemProgressDetail, 'current' | 'units'>,
    progress: string,
    id: string
};

export type ModemDownloadingProgress = {
    status: 'Downloading',
    progressDetail: Pick<ModemProgressDetail, 'current' | 'total'>,
    progress: string,
    id: string
};

export type ModemPulledProgress = {
    status: 'Pull complete',
    progressDetail: Pick<ModemProgressDetail, 'hidecounts'>,
    id: string
};

export type ModemProgress = ModemGenericProgress |
ModemDownloadingProgress |
ModemExtractingProgress |
ModemPulledProgress;

export function isModemProgress(input: unknown) : input is ModemProgress {
    if (!isObject(input)) return false;

    if (typeof input.id !== 'string') {
        return false;
    }

    if (typeof input.progress !== 'string' && typeof input.progress !== 'undefined') {
        return false;
    }

    return isObject(input.progressDetail);
}

export function isModemDownloadProgress(input: unknown) : input is ModemDownloadingProgress {
    if (!isModemProgress(input)) {
        return false;
    }

    return input.status === 'Downloading' && isObject(input.progressDetail);
}

export function isModemExtractingProgress(input: unknown) : input is ModemExtractingProgress {
    if (!isModemProgress(input)) {
        return false;
    }

    return input.status === 'Extracting' && isObject(input.progressDetail);
}

export function isModemPulledProgress(input: unknown) : input is ModemPulledProgress {
    if (!isModemProgress(input)) {
        return false;
    }

    return input.status === 'Pull complete' && isObject(input.progressDetail);
}
