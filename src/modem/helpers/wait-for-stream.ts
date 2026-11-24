/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Modem } from '../types';
import { extractErrorFromModemResponse } from '../utils';
import type { ModemStreamEvent } from '../reader';
import { ModemStreamReader } from '../reader';
import { ModemStreamError } from './error';
import type { ModemStreamWaitOptions } from './types';

/**
 * Call the callback for one event.
 * Returns true when the event handled its chunk, so no later event of
 * the chunk and no onChunk fallback runs.
 */
function dispatchModemStreamEvent(event: ModemStreamEvent, options: ModemStreamWaitOptions) : boolean {
    switch (event.kind) {
        case 'building': {
            if (options.onBuilding) {
                options.onBuilding(event.progress);
            }

            return false;
        }
        case 'downloading': {
            if (options.onDownloading) {
                options.onDownloading(event.progress);

                return true;
            }

            break;
        }
        case 'pushing': {
            if (options.onPushing) {
                options.onPushing(event.progress);

                return true;
            }

            break;
        }
        case 'extracting': {
            if (options.onExtracting) {
                options.onExtracting(event.quantity);

                return true;
            }

            break;
        }
        case 'status': {
            break;
        }
        case 'output': {
            // the chunk was delivered as building events already
            if (options.onBuilding && event.onlyBuildSteps) {
                return true;
            }

            if (options.onStreamChunk) {
                options.onStreamChunk(event.chunk);

                return true;
            }

            return false;
        }
    }

    // a status chunk without a matching specific callback
    if (options.onStatusChunk) {
        options.onStatusChunk(event.chunk);

        return true;
    }

    return false;
}

export async function waitForModemStream(
    modem: Pick<Modem, 'followProgress'>,
    stream: NodeJS.ReadableStream,
    options: ModemStreamWaitOptions = {},
) {
    const reader = new ModemStreamReader();

    return new Promise<unknown>((resolve, reject) => {
        modem.followProgress(
            stream,
            (error, response) => {
                const failure = error || extractErrorFromModemResponse(response);

                if (failure) {
                    reject(new ModemStreamError(failure.message, {
                        output: reader.lines(),
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
                for (const event of reader.push(res)) {
                    if (dispatchModemStreamEvent(event, options)) {
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
