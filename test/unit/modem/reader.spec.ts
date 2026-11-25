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
        const chunk = {
            status: 'Downloading',
            progressDetail: { current: 5, total: 10 },
            progress: '',
            id: 'a',
        };
        const events = new ModemStreamReader().push(chunk)
            .filter((event) => event.kind !== 'downloadingTotal');

        expect(events).toEqual([{
            kind: 'downloading',
            progress: buildProgress(5, 10),
            chunk,
        }]);
        expect(events[0].kind === 'downloading' && events[0].chunk).toBe(chunk);
    });

    it('classifies pushing, extracting and other status chunks', () => {
        const reader = new ModemStreamReader();
        const pushing = {
            status: 'Pushing',
            progressDetail: { current: 3, total: 4 },
            progress: '',
            id: 'a',
        };
        const extracting = {
            status: 'Extracting',
            progressDetail: { current: 7, units: 's' },
            progress: '',
            id: 'a',
        };
        const waiting = { status: 'Waiting', id: 'a' };

        expect(reader.push(pushing)).toEqual([
            { kind: 'pushingTotal', progress: buildProgress(3, 4) },
            {
                kind: 'pushing',
                progress: buildProgress(3, 4),
                chunk: pushing,
            },
        ]);
        expect(reader.push(extracting)).toEqual([{
            kind: 'extracting',
            quantity: { value: 7, unit: 's' },
            chunk: extracting,
        }]);
        expect(reader.push(waiting)).toEqual([{ kind: 'status', chunk: waiting }]);
    });

    it('emits building events before the output event', () => {
        const reader = new ModemStreamReader();
        const steps = { stream: 'Step 1/2 : FROM x\n ---> abc\n' };
        const text = { stream: 'hello\n' };

        expect(reader.push(steps)).toEqual([
            { kind: 'building', progress: buildProgress(1, 4) },
            { kind: 'building', progress: buildProgress(2, 4) },
            {
                kind: 'output',
                chunk: steps,
                onlyBuildSteps: true,
            },
        ]);
        expect(reader.push(text)).toEqual([{
            kind: 'output',
            chunk: text,
            onlyBuildSteps: false,
        }]);
    });

    it('keeps step state across pushes', () => {
        const reader = new ModemStreamReader();
        const head = { stream: 'Step 10/' };
        const tail = { stream: '11 : RUN x\n' };

        expect(reader.push(head)).toEqual([{
            kind: 'output',
            chunk: head,
            onlyBuildSteps: false,
        }]);
        expect(reader.push(tail)).toEqual([
            { kind: 'building', progress: buildProgress(19, 22) },
            {
                kind: 'output',
                chunk: tail,
                onlyBuildSteps: true,
            },
        ]);
    });

    it('ignores an end-step line without a started step', () => {
        const chunk = { stream: ' ---> abc\n' };

        expect(new ModemStreamReader().push(chunk)).toEqual([{
            kind: 'output',
            chunk,
            onlyBuildSteps: false,
        }]);
    });

    it('orders building, total, status, output for a chunk with both fields', () => {
        const chunk = {
            status: 'Downloading',
            progressDetail: { current: 3, total: 4 },
            id: 'a',
            stream: 'Step 1/1 : FROM x\n',
        };

        expect(new ModemStreamReader().push(chunk).map((event) => event.kind)).toEqual(['building', 'downloadingTotal', 'downloading', 'output']);
    });

    it('gives no event for an unknown chunk', () => {
        expect(new ModemStreamReader().push({ other: {} })).toEqual([]);
    });

    it('collects the output lines', () => {
        const reader = new ModemStreamReader();

        reader.push({ stream: 'a\nb' });

        expect(reader.lines()).toEqual(['a', 'b']);
    });

    describe('total progress', () => {
        const layer = (status: string, id: string, current?: number, total?: number) => ({
            status,
            id,
            ...(typeof total === 'number' ? { progressDetail: { current, total } } : {}),
        });
        const totals = (events: { kind: string }[]) => events.filter((e) => e.kind.endsWith('Total'));

        it('sums download progress over layers', () => {
            const reader = new ModemStreamReader();
            reader.push(layer('Downloading', 'a', 10, 100));

            expect(reader.push(layer('Downloading', 'b', 30, 100))).toContainEqual({
                kind: 'downloadingTotal',
                progress: buildProgress(40, 200),
            });
        });

        it('completes a layer on Download complete', () => {
            const reader = new ModemStreamReader();
            reader.push(layer('Downloading', 'a', 10, 100));
            reader.push(layer('Downloading', 'b', 30, 100));

            expect(reader.push({ status: 'Download complete', id: 'a' })).toEqual([
                { kind: 'downloadingTotal', progress: buildProgress(130, 200) },
                { kind: 'status', chunk: { status: 'Download complete', id: 'a' } },
            ]);
        });

        it('sums push progress and completes on Pushed / Layer already exists', () => {
            const reader = new ModemStreamReader();
            reader.push(layer('Pushing', 'a', 10, 100));
            reader.push(layer('Pushing', 'b', 30, 100));

            expect(totals(reader.push({ status: 'Pushed', id: 'a' }))).toEqual([
                { kind: 'pushingTotal', progress: buildProgress(130, 200) },
            ]);
            expect(totals(reader.push({ status: 'Layer already exists', id: 'b' }))).toEqual([
                { kind: 'pushingTotal', progress: buildProgress(200, 200) },
            ]);
        });

        it('ignores layers without byte counts', () => {
            const reader = new ModemStreamReader();

            expect(totals(reader.push({ status: 'Downloading', id: 'c', progressDetail: {} }))).toEqual([]);
            expect(totals(reader.push(layer('Downloading', 'c', 0, 0)))).toEqual([]);
            expect(totals(reader.push({ status: 'Layer already exists', id: 'x' }))).toEqual([]);
        });
    });

    it('emits an aux event', () => {
        const chunk = { aux: { ID: 'sha256:abc' } };

        expect(new ModemStreamReader().push(chunk)).toEqual([
            { kind: 'aux', aux: { ID: 'sha256:abc' }, chunk },
        ]);
    });
});
