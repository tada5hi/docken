import { describe, expect, it } from 'vitest';
/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildProgress } from '../../../src/helpers';
import { parseModemProgressStreamAsStepStart } from '../../../src/modem/utils/chunk-stream';

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
});
