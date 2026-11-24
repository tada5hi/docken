import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { Modem } from '../../../src/modem';
import { isModemStreamError, waitForModemStream } from '../../../src/modem';

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

const stream = new Readable({ read() { this.push(null); } });

async function catchError(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (e) {
        return e;
    }
    return undefined;
}

describe('waitForModemStream', () => {
    const chunks = [
        { stream: 'Step 1/2 : FROM x\n' },
        { stream: ' ---> abc\n' },
        { stream: 'Step 2/2 : RUN fail\n' },
        { stream: 'boom\n' },
    ];

    it('should reject with a ModemStreamError carrying the output', async () => {
        const modem = createFakeModem(
            chunks,
            null,
            [...chunks, { errorDetail: { message: 'returned a non-zero code: 1' } }],
        );
        const error = await catchError(waitForModemStream(modem, stream, { onBuilding: () => {} }));

        expect(isModemStreamError(error)).toBe(true);
        if (!isModemStreamError(error)) throw new Error('unreachable');
        expect(error.name).toBe('ModemStreamError');
        expect(error.message).toBe('returned a non-zero code: 1');
        expect(error.cause).toBeInstanceOf(Error);
        expect(error.output).toContain('Step 2/2 : RUN fail');
        expect(error.output[error.output.length - 1]).toBe('boom');
    });

    it('should wrap a transport error and keep it as cause', async () => {
        const failure = new Error('socket hang up');
        const modem = createFakeModem([{ stream: 'x\n' }], failure, []);
        const error = await catchError(waitForModemStream(modem, stream));

        expect(isModemStreamError(error)).toBe(true);
        if (!isModemStreamError(error)) throw new Error('unreachable');
        expect(error.message).toBe('socket hang up');
        expect(error.cause).toBe(failure);
        expect(error.output).toEqual(['x']);
    });

    it('should honour outputLimit', async () => {
        const modem = createFakeModem(chunks, new Error('fail'), []);
        const error = await catchError(waitForModemStream(modem, stream, { outputLimit: 1 }));

        if (!isModemStreamError(error)) throw new Error('not a ModemStreamError');
        expect(error.output).toEqual(['boom']);
    });

    it('should recognise an error of another module copy', () => {
        expect(isModemStreamError({ name: 'ModemStreamError', output: ['a'] })).toBe(true);
        expect(isModemStreamError({ name: 'ModemStreamError', output: [1] })).toBe(false);
        expect(isModemStreamError(new Error('x'))).toBe(false);
        expect(isModemStreamError(null)).toBe(false);
    });

    it('should resolve and keep dispatching unchanged on success', async () => {
        const received: string[] = [];
        let finished = false;
        const modem = createFakeModem(chunks, null, chunks);

        await waitForModemStream(modem, stream, {
            onBuilding: () => {},
            onStreamChunk: (chunk) => { received.push(chunk.stream); },
            onFinished: () => { finished = true; },
        });

        expect(received).toEqual(['boom\n']);
        expect(finished).toBe(true);
    });
});
