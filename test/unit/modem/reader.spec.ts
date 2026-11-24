/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { buildProgress } from '../../../src/helpers';
import { ModemStreamReader } from '../../../src/modem/reader';

describe('modem/reader', () => {
    it('classifies a downloading chunk', () => {
        const reader = new ModemStreamReader();
        const chunk = {
            status: 'Downloading',
            progressDetail: { current: 5, total: 10 },
            progress: '',
            id: 'a',
        };
        const event = reader.push(chunk);

        expect(event.status).toEqual({ kind: 'downloading', progress: buildProgress(5, 10) });
        expect(event.stream).toBeUndefined();
        expect(event.chunk).toBe(chunk);
    });

    it('classifies pushing, extracting and other status chunks', () => {
        const reader = new ModemStreamReader();

        expect(reader.push({
            status: 'Pushing',
            progressDetail: { current: 3, total: 4 },
            progress: '',
            id: 'a',
        }).status).toEqual({ kind: 'pushing', progress: buildProgress(3, 4) });

        expect(reader.push({
            status: 'Extracting',
            progressDetail: { current: 7, units: 's' },
            progress: '',
            id: 'a',
        }).status).toEqual({ kind: 'extracting', quantity: { value: 7, unit: 's' } });

        expect(reader.push({ status: 'Waiting', id: 'a' }).status).toEqual({ kind: 'other' });
    });

    it('reports build progress and buildOnly', () => {
        const reader = new ModemStreamReader();

        expect(reader.push({ stream: 'Step 1/2 : FROM x\n ---> abc\n' }).stream).toEqual({
            building: [buildProgress(1, 4), buildProgress(2, 4)],
            buildOnly: true,
        });
        expect(reader.push({ stream: 'hello\n' }).stream).toEqual({ building: [], buildOnly: false });
    });

    it('keeps step state across pushes', () => {
        const reader = new ModemStreamReader();

        expect(reader.push({ stream: 'Step 10/' }).stream).toEqual({ building: [], buildOnly: false });
        expect(reader.push({ stream: '11 : RUN x\n' }).stream).toEqual({
            building: [buildProgress(19, 22)],
            buildOnly: true,
        });
    });

    it('ignores an end-step line without a started step', () => {
        const reader = new ModemStreamReader();

        expect(reader.push({ stream: ' ---> abc\n' }).stream).toEqual({ building: [], buildOnly: false });
    });

    it('classifies an unknown chunk', () => {
        const event = new ModemStreamReader().push({ aux: {} });

        expect(event.status).toBeUndefined();
        expect(event.stream).toBeUndefined();
    });

    it('collects the output lines', () => {
        const reader = new ModemStreamReader();

        reader.push({ stream: 'a\nb' });

        expect(reader.lines()).toEqual(['a', 'b']);
    });
});
