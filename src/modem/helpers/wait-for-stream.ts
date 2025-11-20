/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Progress } from '../../helpers';
import { buildProgress } from '../../helpers';
import type { Modem } from '../types';
import {
    isModemDownloadingStatusChunk,
    isModemExtractingStatusChunk,
    isModemPushingStatusChunk,
    isModemStatusChunk,
} from '../utils/chunk-status';
import {
    isModemProgressStream,
    isModemProgressStreamEndStep,
    parseModemProgressStreamAsStepStart,
} from '../utils/chunk-stream';
import { extractErrorFromModemResponse } from '../utils/response-error';
import type { ModemStreamWaitOptions } from './types';

export async function waitForModemStream(
    modem: Modem,
    stream: NodeJS.ReadableStream,
    options: ModemStreamWaitOptions = {},
) {
    let step : Progress | undefined;

    return new Promise<unknown>((resolve, reject) => {
        modem.followProgress(
            stream,
            (error, output) => {
                error = error || extractErrorFromModemResponse(output);
                if (error) {
                    reject(error);
                    return;
                }

                if (options.onFinished) {
                    options.onFinished();
                }

                resolve(output);
            },
            (res) => {
                if (isModemStatusChunk(res)) {
                    if (
                        options.onDownloading &&
                        isModemDownloadingStatusChunk(res)
                    ) {
                        options.onDownloading(buildProgress(res.progressDetail.current, res.progressDetail.total));
                        return;
                    }

                    if (
                        options.onPushing &&
                        isModemPushingStatusChunk(res)
                    ) {
                        options.onPushing(buildProgress(res.progressDetail.current, res.progressDetail.total));
                        return;
                    }

                    if (
                        options.onExtracting &&
                        isModemExtractingStatusChunk(res)
                    ) {
                        options.onExtracting(res.progressDetail.current, res.progressDetail.units);
                        return;
                    }

                    if (options.onStatusChunk) {
                        options.onStatusChunk(res);
                        return;
                    }
                }

                if (isModemProgressStream(res)) {
                    if (options.onBuilding) {
                        if (step && isModemProgressStreamEndStep(res)) {
                            options.onBuilding(buildProgress(step.current + 1, step.total));

                            step = undefined;
                            return;
                        }

                        const temp = parseModemProgressStreamAsStepStart(res);
                        if (temp) {
                            step = temp;
                            options.onBuilding(step);
                            return;
                        }
                    }

                    if (options.onStreamChunk) {
                        options.onStreamChunk(res);
                        return;
                    }
                }

                if (options.onChunk) {
                    options.onChunk(res);
                }
            },
        );
    });
}
