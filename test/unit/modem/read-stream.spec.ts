/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { Modem, ModemStreamEvent } from '../../../src/modem';
import { isModemStreamError, readModemStream } from '../../../src/modem';
import { ModemStreamReader } from '../../../src/modem/reader';

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

function createStream() {
    return new Readable({
        read() {
            // never ends
        },
    });
}

async function collect(iterator: AsyncIterable<ModemStreamEvent>): Promise<ModemStreamEvent[]> {
    const events: ModemStreamEvent[] = [];
    for await (const event of iterator) {
        events.push(event);
    }

    return events;
}

describe('readModemStream', () => {
    const chunks = [
        { stream: 'Step 1/1 : FROM x\n' },
        { status: 'Pulling fs layer', id: 'abc' },
        { stream: 'done\n' },
    ];

    it('should yield every event in order and end on success', async () => {
        const modem = createFakeModem(chunks, null, chunks);
        const events = await collect(readModemStream(modem, createStream()));

        const reader = new ModemStreamReader();
        const expected = chunks.flatMap((chunk) => reader.push(chunk));

        expect(expected.length).toBeGreaterThan(0);
        expect(events).toEqual(expected);
    });

    it('should throw the ModemStreamError on failure after yielding earlier events', async () => {
        const modem = createFakeModem(chunks, null, [...chunks, { errorDetail: { message: 'boom' } }]);
        const events: ModemStreamEvent[] = [];
        let caught: unknown;

        try {
            for await (const event of readModemStream(modem, createStream())) {
                events.push(event);
            }
        } catch (e) {
            caught = e;
        }

        expect(events.length).toBeGreaterThan(0);
        expect(isModemStreamError(caught)).toBe(true);
    });

    it('should destroy the stream when the consumer breaks early', async () => {
        const modem: FakeModem = {
            followProgress(_stream, _onFinished, onProgress) {
                onProgress?.(chunks[0]);
                onProgress?.(chunks[1]);
            },
        };
        const stream = createStream();

        for await (const event of readModemStream(modem, stream)) {
            expect(event).toBeDefined();
            break;
        }

        expect(stream.destroyed).toBe(true);
    });

    it('should throw an aborted error via signal', async () => {
        const modem: FakeModem = {
            followProgress() {
                // never finishes
            },
        };
        const controller = new AbortController();
        const stream = createStream();
        const iterator = readModemStream(modem, stream, { signal: controller.signal });

        setTimeout(() => controller.abort(), 5);

        let caught: unknown;
        try {
            await collect(iterator);
        } catch (e) {
            caught = e;
        }

        expect(isModemStreamError(caught)).toBe(true);
        expect((caught as { aborted?: boolean }).aborted).toBe(true);
        expect(stream.destroyed).toBe(true);
    });
});
