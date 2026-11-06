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

export type ModemStreamChunk = {
    stream: string,
};
