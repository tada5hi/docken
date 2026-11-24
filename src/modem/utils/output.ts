/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const MODEM_STREAM_OUTPUT_LIMIT = 100;

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_REGEX = /\u001b\[[0-9;?]*[A-Za-z]/g;

function cleanLine(raw: string): string {
    // a trailing \r belongs to a \r\n line ending, not to a progress overwrite
    const text = raw.replace(/\r+$/, '');
    const index = text.lastIndexOf('\r');

    return (index === -1 ? text : text.slice(index + 1))
        .replace(ANSI_ESCAPE_REGEX, '')
        .trimEnd();
}

/**
 * Bounded tail of the raw `stream` text of a docker build.
 */
export class ModemStreamOutput {
    protected limit: number;

    protected completed: string[] = [];

    protected pending = '';

    constructor(limit: number = MODEM_STREAM_OUTPUT_LIMIT) {
        this.limit = limit;
    }

    push(chunk: string): void {
        const parts = (this.pending + chunk).split('\n');

        this.pending = parts.pop() ?? '';

        for (const part of parts) {
            const line = cleanLine(part);

            if (line.length > 0) {
                this.completed.push(line);
            }
        }

        if (this.completed.length > this.limit) {
            this.completed = this.completed.slice(this.completed.length - this.limit);
        }
    }

    lines(): string[] {
        const pending = cleanLine(this.pending);
        const all = pending.length > 0 ?
            [...this.completed, pending] :
            [...this.completed];

        return all.length > this.limit ?
            all.slice(all.length - this.limit) :
            all;
    }
}
