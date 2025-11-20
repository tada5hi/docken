/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Progress } from '../../src';
import {
    createClient,
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

        const downloadingProgress : Progress[] = [];
        const extractingProgress : number[] = [];

        await waitForStream(client, imageStream, {
            onDownloading(input) {
                downloadingProgress.push(input);
            },
            onExtracting(input) {
                extractingProgress.push(input);
            },
        });

        expect(downloadingProgress.length).toBeGreaterThanOrEqual(0);
        expect(extractingProgress.length).toBeGreaterThanOrEqual(0);
    });

    it('should inspect image', async () => {
        const image = client.getImage('hello-world:latest');
        const info = await image.inspect();

        expect(info.Id).toBeDefined();
        expect(info.Created).toBeDefined();
        expect(info.Size).toBeGreaterThan(0);
    });

    it('should build image', async () => {
        const image = await client.buildImage({
            src: ['.'],
            context: 'test/data/daemon/',
        }, {
            t: 'tada5hi/test',
        });

        const steps : Progress[] = [];

        await waitForStream(client, image, {
            onBuilding(step) {
                steps.push(step);
            },
        });

        expect(steps.length).toEqual(4);
    });
});
