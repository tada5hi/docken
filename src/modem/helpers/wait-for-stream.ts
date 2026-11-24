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
    ModemStreamOutput,
    extractErrorFromModemResponse,
    isModemDownloadingStatusChunk,
    isModemExtractingStatusChunk,
    isModemProgressLineEndStep,
    isModemProgressStream,
    isModemPushingStatusChunk,
    isModemStatusChunk,
    parseModemProgressLineAsStepStart,
} from '../utils';
import { ModemStreamError } from './error';
import type { ModemStreamWaitOptions } from './types';

export async function waitForModemStream(
    modem: Pick<Modem, 'followProgress'>,
    stream: NodeJS.ReadableStream,
    options: ModemStreamWaitOptions = {},
) {
    let step : Progress | undefined;
    const output = new ModemStreamOutput();

    return new Promise<unknown>((resolve, reject) => {
        modem.followProgress(
            stream,
            (error, response) => {
                const failure = error || extractErrorFromModemResponse(response);

                if (failure) {
                    reject(new ModemStreamError(failure.message, {
                        output: output.lines(),
                        cause: failure,
                    }));

                    return;
                }

                if (options.onFinished) {
                    options.onFinished();
                }

                resolve(response);
            },
            (res) => {
                // a chunk is withheld from onStreamChunk when every line it completed was a building event
                let consumed = false;

                if (isModemProgressStream(res)) {
                    const lines = output.push(res.stream);

                    if (options.onBuilding) {
                        let events = 0;

                        for (const line of lines) {
                            if (step && isModemProgressLineEndStep(line)) {
                                options.onBuilding(buildProgress(step.current + 1, step.total));
                                step = undefined;
                                events++;

                                continue;
                            }

                            const temp = parseModemProgressLineAsStepStart(line);

                            if (temp) {
                                step = temp;
                                options.onBuilding(step);
                                events++;
                            }
                        }

                        consumed = events > 0 && events === lines.length;
                    }
                }

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
                        options.onExtracting({
                            value: res.progressDetail.current,
                            unit: res.progressDetail.units,
                        });

                        return;
                    }

                    if (options.onStatusChunk) {
                        options.onStatusChunk(res);

                        return;
                    }
                }

                if (isModemProgressStream(res)) {
                    if (consumed) {
                        return;
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
