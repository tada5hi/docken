/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Readable } from 'node:stream';
import { 
    describe, 
    expect, 
    it, 
    vi, 
} from 'vitest';
import { buildProgress } from '../../../src/helpers';
import type { Modem } from '../../../src/modem';
import { waitForModemStream } from '../../../src/modem';

type FakeModem = Pick<Modem, 'followProgress'>;

function createFakeModem(chunks: Record<string, any>[], error: Error | null, output: unknown[]): FakeModem {
    return {
        followProgress(_stream, onFinished, onProgress) {
            for (const chunk of chunks) {
                onProgress?.(chunk);
            }

            onFinished(error, output);
        },
    };
}

const stream = new Readable({
    read() {
        this.push(null);
    },
});

function run(chunks: Record<string, any>[], options: Parameters<typeof waitForModemStream>[2]) {
    return waitForModemStream(createFakeModem(chunks, null, chunks), stream, options);
}

describe('waitForModemStream dispatch', () => {
    const downloading = {
        status: 'Downloading',
        progressDetail: { current: 5, total: 10 },
        progress: '',
        id: 'a',
    };

    it('routes a downloading chunk to onDownloading only', async () => {
        const onDownloading = vi.fn();
        const onStatusChunk = vi.fn();
        const onChunk = vi.fn();

        await run([downloading], {
            onDownloading, 
            onStatusChunk, 
            onChunk, 
        });

        expect(onDownloading.mock.calls).toEqual([[buildProgress(5, 10)]]);
        expect(onStatusChunk).not.toHaveBeenCalled();
        expect(onChunk).not.toHaveBeenCalled();
    });

    it('falls back to onStatusChunk without onDownloading', async () => {
        const onStatusChunk = vi.fn();
        const onChunk = vi.fn();

        await run([downloading], { onStatusChunk, onChunk });

        expect(onStatusChunk).toHaveBeenCalledTimes(1);
        expect(onStatusChunk.mock.calls[0][0]).toBe(downloading);
        expect(onChunk).not.toHaveBeenCalled();
    });

    it('falls back to onChunk without any status callback', async () => {
        const onChunk = vi.fn();

        await run([downloading], { onChunk });

        expect(onChunk).toHaveBeenCalledTimes(1);
        expect(onChunk.mock.calls[0][0]).toBe(downloading);
    });

    it('routes a pushing chunk to onPushing', async () => {
        const onPushing = vi.fn();

        await run([{
            status: 'Pushing',
            progressDetail: { current: 3, total: 4 },
            progress: '',
            id: 'a',
        }], { onPushing });

        expect(onPushing.mock.calls).toEqual([[buildProgress(3, 4)]]);
    });

    it('routes an extracting chunk to onExtracting', async () => {
        const onExtracting = vi.fn();

        await run([{
            status: 'Extracting',
            progressDetail: { current: 7, units: 's' },
            progress: '',
            id: 'a',
        }], { onExtracting });

        expect(onExtracting.mock.calls).toEqual([[{ value: 7, unit: 's' }]]);
    });

    it('forwards every stream chunk without onBuilding', async () => {
        const received: string[] = [];

        await run(
            [{ stream: 'Step 1/2 : FROM x\n' }, { stream: ' ---> abc\n' }],
            {
                onStreamChunk: (chunk) => {
                    received.push(chunk.stream); 
                }, 
            },
        );

        expect(received).toEqual(['Step 1/2 : FROM x\n', ' ---> abc\n']);
    });

    it('forwards a chunk that mixes build and other lines', async () => {
        const onBuilding = vi.fn();
        const onStreamChunk = vi.fn();
        const chunk = { stream: 'Step 1/2 : FROM x\n ---> abc\nhello\n' };

        await run([chunk], { onBuilding, onStreamChunk });

        expect(onBuilding.mock.calls).toEqual([[buildProgress(1, 4)], [buildProgress(2, 4)]]);
        expect(onStreamChunk).toHaveBeenCalledTimes(1);
        expect(onStreamChunk.mock.calls[0][0]).toBe(chunk);
    });

    it('forwards an end-step line without a started step', async () => {
        const onBuilding = vi.fn();
        const onStreamChunk = vi.fn();
        const chunk = { stream: ' ---> abc\n' };

        await run([chunk], { onBuilding, onStreamChunk });

        expect(onBuilding).not.toHaveBeenCalled();
        expect(onStreamChunk).toHaveBeenCalledTimes(1);
        expect(onStreamChunk.mock.calls[0][0]).toBe(chunk);
    });

    it('falls back to onChunk without onStreamChunk, build steps included', async () => {
        const onBuilding = vi.fn();
        const onChunk = vi.fn();
        const first = { stream: 'hello\n' };
        const second = { stream: 'Step 1/2 : FROM x\n' };

        await run([first, second], { onBuilding, onChunk });

        expect(onBuilding).toHaveBeenCalledWith(buildProgress(1, 4));
        expect(onChunk).toHaveBeenCalledTimes(2);
        expect(onChunk.mock.calls[0][0]).toBe(first);
        expect(onChunk.mock.calls[1][0]).toBe(second);
    });

    it('routes an unknown chunk to onChunk', async () => {
        const onStatusChunk = vi.fn();
        const onStreamChunk = vi.fn();
        const onChunk = vi.fn();
        const chunk = { aux: { ID: 'sha256:x' } };

        await run([chunk], {
            onStatusChunk, 
            onStreamChunk, 
            onChunk, 
        });

        expect(onStatusChunk).not.toHaveBeenCalled();
        expect(onStreamChunk).not.toHaveBeenCalled();
        expect(onChunk).toHaveBeenCalledTimes(1);
        expect(onChunk.mock.calls[0][0]).toBe(chunk);
    });

    it('dispatches building before status for a mixed chunk', async () => {
        const log: string[] = [];
        const values: unknown[] = [];
        const onStreamChunk = vi.fn();

        await run([{
            status: 'Downloading',
            progressDetail: { current: 3, total: 4 },
            id: 'a',
            stream: 'Step 1/1 : FROM x\n',
        }], {
            onBuilding: (p) => {
                log.push('building');
                values.push(p);
            },
            onDownloading: (p) => {
                log.push('downloading');
                values.push(p);
            },
            onStreamChunk,
        });

        expect(log).toEqual(['building', 'downloading']);
        expect(values).toEqual([buildProgress(1, 2), buildProgress(3, 4)]);
        expect(onStreamChunk).not.toHaveBeenCalled();
    });

    it('resolves the response and calls onFinished', async () => {
        const onFinished = vi.fn();
        const modem = createFakeModem([], null, [{ ok: 1 }]);

        const response = await waitForModemStream(modem, stream, { onFinished });

        expect(response).toEqual([{ ok: 1 }]);
        expect(onFinished).toHaveBeenCalledTimes(1);
    });
});
