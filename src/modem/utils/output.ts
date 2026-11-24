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
// A trailing \r run may end the line (\r\n split across chunks): keep it and the text before it.
// Called only when new text holds a \r, so the backwards scan stops in that text.
function collapsePending(pending: string): string {
    let end = pending.length;

    while (end > 0 && pending.charCodeAt(end - 1) === 13) {
        end--;
    }

    const last = end > 0 ? pending.lastIndexOf('\r', end - 1) : -1;

    return last === -1 ? pending : pending.slice(last + 1);
}

/**
 * Assembled lines of the raw `stream` text of a docker build.
 * Every completed line is retained.
 */
export class ModemStreamOutput {
    protected completed: string[] = [];

    protected pending = '';

    /**
     * Append a chunk and return the cleaned, non-empty lines it completed, in order.
     * These are exactly the lines added to the retained output.
     */
    push(chunk: string): string[] {
        // split only the new chunk: re-scanning a long pending line on every chunk is quadratic
        const parts = chunk.split('\n');
        const tail = parts.pop() ?? '';

        if (parts.length === 0) {
            this.pending += tail;
        } else {
            parts[0] = this.pending + parts[0];
            this.pending = tail;
        }

        if (tail.includes('\r')) {
            this.pending = collapsePending(this.pending);
        }

        const added: string[] = [];

        for (const part of parts) {
            const line = cleanLine(part);

            if (line.length > 0) {
                added.push(line);
                this.completed.push(line);
            }
        }

        return added;
    }

    lines(): string[] {
        const pending = cleanLine(this.pending);

        return pending.length > 0 ?
            [...this.completed, pending] :
            [...this.completed];
    }
}
