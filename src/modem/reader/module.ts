/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Progress } from '../../helpers';
import { buildProgress } from '../../helpers';
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

    /**
     * Classify a chunk, whatever callbacks a caller registered.
     * Events come in this order: building events, the status event, the output event.
     * An unrecognized chunk gives no event.
     */
    push(chunk: ObjectLiteral) : ModemStreamEvent[] {
        const events : ModemStreamEvent[] = [];
        let output : ModemStreamEvent | undefined;

        if (isModemProgressStream(chunk)) {
            // eslint-disable-next-line unicorn/no-return-array-push -- ModemStreamOutput.push returns the completed lines.
            const lines = this.output.push(chunk.stream);

            for (const line of lines) {
                const progress = this.readBuildStep(line);

                if (progress) {
                    events.push({ kind: 'building', progress });
                }
            }

            output = { kind: 'output', chunk };
        }

        if (isModemStatusChunk(chunk)) {
            events.push(this.classifyStatus(chunk));
        }

        if (output) {
            events.push(output);
        }

        return events;
    }

    lines() : string[] {
        return this.output.lines();
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
