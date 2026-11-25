/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Progress } from '../../helpers';
import { buildProgress } from '../../helpers';
import { isObject } from 'smob';
import type { ObjectLiteral } from '../../types';
import type { ModemGenericStatusChunk } from '../utils';
import {
    ModemStreamOutput,
    isModemDownloadingStatusChunk,
    isModemExtractingStatusChunk,
    isModemProgressLineEndStep,
    isModemProgressStream,
    isModemPushingStatusChunk,
    isModemStatusChunk,
    parseModemProgressLineAsStepStart,
} from '../utils';
import type { ModemStreamEvent } from './types';

export class ModemStreamReader {
    protected output = new ModemStreamOutput();

    protected step : Progress | undefined;

    protected downloads = new Map<string, { current: number, total: number }>();

    protected pushes = new Map<string, { current: number, total: number }>();

    /**
     * Classify a chunk, whatever callbacks a caller registered.
     * Events come in this order: building events, the total event, the status or aux event, the output event.
     * An unrecognized chunk gives no event.
     */
    push(chunk: ObjectLiteral) : ModemStreamEvent[] {
        const events : ModemStreamEvent[] = [];
        let output : ModemStreamEvent | undefined;

        if (isModemProgressStream(chunk)) {
            // eslint-disable-next-line unicorn/no-return-array-push -- ModemStreamOutput.push returns the completed lines.
            const lines = this.output.push(chunk.stream);
            let steps = 0;

            for (const line of lines) {
                const progress = this.readBuildStep(line);

                if (progress) {
                    events.push({ kind: 'building', progress });
                    steps++;
                }
            }

            output = {
                kind: 'output',
                chunk,
                onlyBuildSteps: steps > 0 && steps === lines.length,
            };
        }

        if (isModemStatusChunk(chunk)) {
            const total = this.trackLayers(chunk);

            if (total) {
                events.push(total);
            }

            events.push(this.classifyStatus(chunk));
        }

        if (isObject(chunk.aux)) {
            events.push({
                kind: 'aux', 
                aux: chunk.aux, 
                chunk, 
            });
        }

        if (output) {
            events.push(output);
        }

        return events;
    }

    lines() : string[] {
        return this.output.lines();
    }

    protected trackLayers(chunk: ModemGenericStatusChunk) : ModemStreamEvent | undefined {
        let layers : Map<string, { current: number, total: number }>;
        let kind : 'downloadingTotal' | 'pushingTotal';
        let complete : boolean;

        if (chunk.status === 'Downloading' || chunk.status === 'Download complete') {
            layers = this.downloads;
            kind = 'downloadingTotal';
            complete = chunk.status !== 'Downloading';
        } else if (
            chunk.status === 'Pushing' ||
            chunk.status === 'Pushed' ||
            chunk.status === 'Layer already exists'
        ) {
            layers = this.pushes;
            kind = 'pushingTotal';
            complete = chunk.status !== 'Pushing';
        } else {
            return undefined;
        }

        if (typeof chunk.id !== 'string') {
            return undefined;
        }

        const previous = layers.get(chunk.id);

        if (complete) {
            if (!previous || previous.current === previous.total) {
                return undefined;
            }

            layers.set(chunk.id, { current: previous.total, total: previous.total });
        } else {
            const { current, total } = chunk.progressDetail || {};

            if (
                typeof current !== 'number' ||
                typeof total !== 'number' ||
                !Number.isFinite(current) ||
                !Number.isFinite(total) ||
                total <= 0
            ) {
                return undefined;
            }

            layers.set(chunk.id, { current, total });
        }

        let current = 0;
        let total = 0;

        for (const layer of layers.values()) {
            current += layer.current;
            total += layer.total;
        }

        return { kind, progress: buildProgress(current, total) };
    }

    protected readBuildStep(line: string) : Progress | undefined {
        if (this.step && isModemProgressLineEndStep(line)) {
            const progress = buildProgress(this.step.current + 1, this.step.total);

            this.step = undefined;

            return progress;
        }

        const start = parseModemProgressLineAsStepStart(line);

        if (start) {
            this.step = start;
        }

        return start;
    }

    protected classifyStatus(chunk: ModemGenericStatusChunk) : ModemStreamEvent {
        if (isModemDownloadingStatusChunk(chunk)) {
            return {
                kind: 'downloading',
                progress: buildProgress(chunk.progressDetail.current, chunk.progressDetail.total),
                chunk,
            };
        }

        if (isModemPushingStatusChunk(chunk)) {
            return {
                kind: 'pushing',
                progress: buildProgress(chunk.progressDetail.current, chunk.progressDetail.total),
                chunk,
            };
        }

        if (isModemExtractingStatusChunk(chunk)) {
            return {
                kind: 'extracting',
                quantity: {
                    value: chunk.progressDetail.current,
                    unit: chunk.progressDetail.units,
                },
                chunk,
            };
        }

        return { kind: 'status', chunk };
    }
}
