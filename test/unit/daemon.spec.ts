/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, ModemProgress } from '../../src';
import {
    createClient,
    isModemDownloadProgress,
    isModemExtractingProgress,
    isModemPulledProgress,
    waitForStream,
} from '../../src';

describe('daemon', () => {
    let client : Client;

    beforeAll(() => {
        client = createClient();
    });

    it('should pull image', async () => {
        const image = client.getImage('hello-world:latest');
        await new Promise<void>((resolve) => {
            image.remove(resolve);
        });

        const imageStream = await client.pull('hello-world:latest');

        const downloadingProgress : ModemProgress[] = [];
        const extractingProgress : ModemProgress[] = [];
        const pulledProgress : ModemProgress[] = [];

        await waitForStream(client, imageStream, {
            onProgress(res) {
                if (isModemDownloadProgress(res)) {
                    downloadingProgress.push(res);
                    return;
                }

                if (isModemExtractingProgress(res)) {
                    extractingProgress.push(res);
                    return;
                }

                if (isModemPulledProgress(res)) {
                    pulledProgress.push(res);
                }
            },
        });

        expect(downloadingProgress.length).toBeGreaterThanOrEqual(0);
        expect(extractingProgress.length).toBeGreaterThanOrEqual(0);
        expect(pulledProgress.length).toEqual(1);
    });

    fit('should inspect image', async () => {
        const image = client.getImage('hello-world:latest');
        const info = await image.inspect();

        expect(info.Id).toBeDefined();
        expect(info.Created).toBeDefined();
        expect(info.Size).toBeGreaterThan(0);
    });
});
