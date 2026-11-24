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
import type { ModemStreamEvent, ModemStreamStatusEvent } from './types';

export class ModemStreamReader {
    protected output = new ModemStreamOutput();

    protected step : Progress | undefined;

    push(chunk: ObjectLiteral) : ModemStreamEvent {
        const event : ModemStreamEvent = { chunk };

        if (isModemProgressStream(chunk)) {
            // eslint-disable-next-line unicorn/no-return-array-push -- ModemStreamOutput.push returns the completed lines.
            const lines = this.output.push(chunk.stream);
            const building : Progress[] = [];

            for (const line of lines) {
                if (this.step && isModemProgressLineEndStep(line)) {
                    building.push(buildProgress(this.step.current + 1, this.step.total));
                    this.step = undefined;

                    continue;
                }

                const temp = parseModemProgressLineAsStepStart(line);

                if (temp) {
                    this.step = temp;
                    building.push(temp);
                }
            }

            event.stream = {
                building,
                buildOnly: building.length > 0 && building.length === lines.length,
            };
        }

        if (isModemStatusChunk(chunk)) {
            event.status = this.classifyStatus(chunk);
        }

        return event;
    }

    lines() : string[] {
        return this.output.lines();
    }

    protected classifyStatus(chunk: ModemGenericStatusChunk) : ModemStreamStatusEvent {
        if (isModemDownloadingStatusChunk(chunk)) {
            return {
                kind: 'downloading',
                progress: buildProgress(chunk.progressDetail.current, chunk.progressDetail.total),
            };
        }

        if (isModemPushingStatusChunk(chunk)) {
            return {
                kind: 'pushing',
                progress: buildProgress(chunk.progressDetail.current, chunk.progressDetail.total),
            };
        }

        if (isModemExtractingStatusChunk(chunk)) {
            return {
                kind: 'extracting',
                quantity: {
                    value: chunk.progressDetail.current,
                    unit: chunk.progressDetail.units,
                },
            };
        }

        return { kind: 'other' };
    }
}
