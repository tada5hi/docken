/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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

// Only the text after the last \r survives cleanLine, so earlier text can go.
// A final \r may be the first half of a \r\n split across chunks: keep from the previous one.
function collapsePending(pending: string): string {
    const last = pending.lastIndexOf('\r');

    if (last === -1) {
        return pending;
    }

    if (last < pending.length - 1) {
        return pending.slice(last + 1);
    }

    const previous = pending.lastIndexOf('\r', last - 1);

    return previous === -1 ? pending : pending.slice(previous + 1);
}

/**
 * Assembled lines of the raw `stream` text of a docker build.
 * Every completed line is retained unless a limit is given.
 */
export class ModemStreamOutput {
    protected limit: number | undefined;

    protected completed: string[] = [];

    protected pending = '';

    /**
     * @param limit optional cap: keep only the newest `limit` lines.
     * Omit it, or pass `Infinity`, to keep every line.
     */
    constructor(limit?: number) {
        this.limit = limit;
    }

    /**
     * Append a chunk and return the cleaned, non-empty lines it completed, in order.
     * These are exactly the lines added to the retained output.
     */
    push(chunk: string): string[] {
        const parts = (this.pending + chunk).split('\n');

        this.pending = collapsePending(parts.pop() ?? '');

        const added: string[] = [];

        for (const part of parts) {
            const line = cleanLine(part);

            if (line.length > 0) {
                added.push(line);
                this.completed.push(line);
            }
        }

        if (this.limit !== undefined && this.completed.length > this.limit) {
            this.completed = this.completed.slice(this.completed.length - this.limit);
        }

        return added;
    }

    lines(): string[] {
        const pending = cleanLine(this.pending);
        const all = pending.length > 0 ?
            [...this.completed, pending] :
            [...this.completed];

        return this.limit !== undefined && all.length > this.limit ?
            all.slice(all.length - this.limit) :
            all;
    }
}
