/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import type { Modem } from '../../../src/modem';
import { buildProgress } from '../../../src/helpers';
import type { Progress } from '../../../src/helpers';
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

const stream = new Readable({
    read() {
        this.push(null); 
    }, 
});

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

        if (!isModemStreamError(error)) {
            throw new Error('unreachable');
        }

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

        if (!isModemStreamError(error)) {
            throw new Error('unreachable');
        }

        expect(error.message).toBe('socket hang up');
        expect(error.cause).toBe(failure);
        expect(error.output).toEqual(['x']);
    });

    it('should mirror code, errno and syscall of the cause', async () => {
        const failure = Object.assign(new Error('read ECONNRESET'), {
            code: 'ECONNRESET', 
            syscall: 'read', 
            errno: -54, 
        });
        const modem = createFakeModem([], failure, []);
        const error = await catchError(waitForModemStream(modem, stream));

        if (!isModemStreamError(error)) {
            throw new Error('not a ModemStreamError');
        }

        expect(error.code).toBe('ECONNRESET');
        expect(error.syscall).toBe('read');
        expect(error.errno).toBe(-54);
    });

    it('should expose no error properties for an errorDetail failure', async () => {
        const modem = createFakeModem([], null, [{ errorDetail: { message: 'nope' } }]);
        const error = await catchError(waitForModemStream(modem, stream));

        if (!isModemStreamError(error)) {
            throw new Error('not a ModemStreamError');
        }

        expect(error.code).toBeUndefined();
        expect(error.errno).toBeUndefined();
        expect(error.syscall).toBeUndefined();
        expect(error.statusCode).toBeUndefined();
    });


    it('should keep output out of enumerable properties', async () => {
        const modem = createFakeModem(chunks, new Error('fail'), []);
        const error = await catchError(waitForModemStream(modem, stream));

        if (!isModemStreamError(error)) {
            throw new Error('not a ModemStreamError');
        }

        expect(error.output).toContain('boom');
        expect(Object.keys(error)).not.toContain('output');
        expect(JSON.stringify(error)).not.toContain('boom');
        expect('output' in { ...error }).toBe(false);
        expect(isModemStreamError(error)).toBe(true);

        const copy = Object.create(Error.prototype);
        Object.defineProperty(copy, 'name', { value: 'ModemStreamError' });
        Object.defineProperty(copy, 'output', { value: ['a'], enumerable: false });
        expect(isModemStreamError(copy)).toBe(true);
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
            onStreamChunk: (chunk) => {
                received.push(chunk.stream); 
            },
            onFinished: () => {
                finished = true; 
            },
        });

        expect(received).toEqual(['boom\n']);
        expect(finished).toBe(true);
    });

    it('should detect a step split across chunks', async () => {
        const progress: Progress[] = [];
        const forwarded: string[] = [];
        const split = [{ stream: 'Step 10/' }, { stream: '11 : RUN x\n' }];
        const modem = createFakeModem(split, null, split);

        await waitForModemStream(modem, stream, {
            onBuilding: (p) => {
                progress.push(p); 
            },
            onStreamChunk: (chunk) => {
                forwarded.push(chunk.stream); 
            },
        });

        expect(progress).toEqual([buildProgress(19, 22)]);
        expect(forwarded).toEqual(['Step 10/']);
    });

    it('should emit the +1 progress for an end-step line', async () => {
        const seen: Progress[] = [];
        const list = [{ stream: 'Step 1/2 : FROM x\n' }, { stream: ' ---> abc\n' }];
        const modem = createFakeModem(list, null, list);

        await waitForModemStream(modem, stream, {
            onBuilding: (p) => {
                seen.push(p); 
            },
        });

        expect(seen).toEqual([buildProgress(1, 4), buildProgress(2, 4)]);
    });
});
