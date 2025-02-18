/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { Modem } from '../types';
import { extractErrorFromModemResponse } from './response-error';

export type ModemStreamWaitOptions = {
    onProgress?: (res: any) => any
};

export async function waitForModemStream(
    modem: Modem,
    stream: NodeJS.ReadableStream,
    options: ModemStreamWaitOptions = {},
) {
    return new Promise<unknown>((resolve, reject) => {
        modem.followProgress(
            stream,
            (error, output) => {
                error = error || extractErrorFromModemResponse(output);
                if (error) {
                    reject(error);
                    return;
                }

                resolve(output);
            },
            (res) => {
                if (options.onProgress) {
                    options.onProgress(res);
                }
            },
        );
    });
}
