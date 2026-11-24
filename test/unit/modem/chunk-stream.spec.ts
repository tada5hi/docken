import { describe, expect, it } from 'vitest';
/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildProgress } from '../../../src/helpers';
import {
    isModemProgressLineEndStep,
    isModemProgressStreamEndStep,
    parseModemProgressLineAsStepStart,
    parseModemProgressStreamAsStepStart,
} from '../../../src/modem/utils/chunk-stream';

describe('modem > utils > chunk-stream', () => {
    it('parses a single-digit build step', () => {
        expect(parseModemProgressStreamAsStepStart({ stream: 'Step 3/4 : FROM scratch\n' }))
            .toEqual(buildProgress(5, 8));
    });

    it('parses a multi-digit build step', () => {
        expect(parseModemProgressStreamAsStepStart({ stream: 'Step 10/11 : RUN pip3 install .\n' }))
            .toEqual(buildProgress(19, 22));
    });

    it('returns undefined for a non-step line', () => {
        expect(parseModemProgressStreamAsStepStart({ stream: 'Removing intermediate container\n' }))
            .toBeUndefined();
    });

    it('keeps the chunk end-step detection', () => {
        expect(isModemProgressStreamEndStep({ stream: ' ---> abc\n' })).toBe(true);
        expect(isModemProgressStreamEndStep({ stream: ' ---> abc' })).toBe(false);
    });

    it('parses a step start line', () => {
        expect(parseModemProgressLineAsStepStart('Step 10/11 : RUN x')).toEqual(buildProgress(19, 22));
        expect(parseModemProgressLineAsStepStart('Removing intermediate container')).toBeUndefined();
    });

    it('detects an end-step line', () => {
        expect(isModemProgressLineEndStep(' ---> abc')).toBe(true);
        expect(isModemProgressLineEndStep(' ---> abc\n')).toBe(false);
        expect(isModemProgressLineEndStep('boom')).toBe(false);
    });
});
