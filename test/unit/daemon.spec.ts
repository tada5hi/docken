import { beforeAll, describe, expect, it } from 'vitest';
/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, Progress } from '../../src';
import {
    createClient,
    isModemStreamError,
    pullImage,
    waitForStream,
} from '../../src';
import type { Quantity } from '../../src/types';

describe('daemon', () => {
    let client : Client;

    beforeAll(() => {
        client = createClient();
    });

    it('should pull image', async () => {
        const imageStream = await client.pull('hello-world:latest');

        const downloadingProgress : Progress[] = [];
        const extractingProgress : Quantity[] = [];

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

    it('should pull image with pullImage and return the digest', async () => {
        const result = await pullImage(client, 'hello-world:latest');

        expect(result.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
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

    it('should reject a failing build with its output', async () => {
        const image = await client.buildImage({
            src: ['.'],
            context: 'test/data/daemon-failing/',
        }, {
            t: 'tada5hi/test-failing',
        });

        let error : unknown;
        try {
            await waitForStream(client, image, { onBuilding: () => {} });
        } catch (e) {
            error = e;
        }

        expect(isModemStreamError(error)).toBe(true);
        if (!isModemStreamError(error)) {
            return;
        }

        expect(error.output.some((line) => /^Step 2\/2 : COPY does-not-exist\.txt/.test(line))).toBe(true);
    });
});
