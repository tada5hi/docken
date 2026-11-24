/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Modem } from '../types';
import { extractErrorFromModemResponse } from '../utils';
import { ModemStreamReader } from '../reader';
import { ModemStreamError } from './error';
import type { ModemStreamWaitOptions } from './types';

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
                const event = reader.push(res);

                if (event.stream && options.onBuilding) {
                    for (const progress of event.stream.building) {
                        options.onBuilding(progress);
                    }
                }

                if (event.status) {
                    if (options.onDownloading && event.status.kind === 'downloading') {
                        options.onDownloading(event.status.progress);

                        return;
                    }

                    if (options.onPushing && event.status.kind === 'pushing') {
                        options.onPushing(event.status.progress);

                        return;
                    }

                    if (options.onExtracting && event.status.kind === 'extracting') {
                        options.onExtracting(event.status.quantity);

                        return;
                    }

                    if (options.onStatusChunk) {
                        options.onStatusChunk(res);

                        return;
                    }
                }

                if (event.stream) {
                    if (options.onBuilding && event.stream.buildOnly) {
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
