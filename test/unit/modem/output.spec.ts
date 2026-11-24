/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { ModemStreamOutput } from '../../../src/modem/utils/output';

describe('modem > utils > output', () => {
    it('joins a partial line with the next push', () => {
        const output = new ModemStreamOutput();
        output.push('a\nb');
        output.push('c\n');
        expect(output.lines()).toEqual(['a', 'bc']);
    });

    it('strips ANSI escapes', () => {
        const output = new ModemStreamOutput();
        output.push('\u001b[31mred\u001b[0m\n');
        expect(output.lines()).toEqual(['red']);
    });

    it('keeps only the text after the last carriage return', () => {
        const output = new ModemStreamOutput();
        output.push('10%\r50%\r100%\n');
        expect(output.lines()).toEqual(['100%']);
    });

    it('drops empty and whitespace-only lines', () => {
        const output = new ModemStreamOutput();
        output.push('\n\n  \n');
        expect(output.lines()).toEqual([]);
    });

    it('includes the pending partial line', () => {
        const output = new ModemStreamOutput();
        output.push('pending');
        expect(output.lines()).toEqual(['pending']);
    });

    it('keeps leading whitespace and trims the end', () => {
        const output = new ModemStreamOutput();
        output.push(' ---> abc  \n');
        expect(output.lines()).toEqual([' ---> abc']);
    });

    it('does not mutate state and returns a copy', () => {
        const output = new ModemStreamOutput();
        output.push('a\nb');
        const first = output.lines();
        first.push('x');
        expect(output.lines()).toEqual(['a', 'b']);
        expect(output.lines()).toEqual(['a', 'b']);
    });

    it('joins a \\r\\n split across chunks', () => {
        const output = new ModemStreamOutput();
        output.push('a\r');
        output.push('\n');
        expect(output.lines()).toEqual(['a']);
    });

    it('joins a \\r\\r\\n split across chunks like a single chunk', () => {
        const split = new ModemStreamOutput();
        split.push('abc\r\r');
        split.push('\n');

        const whole = new ModemStreamOutput();
        whole.push('abc\r\r\n');

        expect(split.lines()).toEqual(['abc']);
        expect(whole.lines()).toEqual(['abc']);
    });

    it('still collapses a redraw before a trailing \\r run', () => {
        const output = new ModemStreamOutput();
        output.push('10%\r50%\r\r');
        output.push('\n');
        expect(output.lines()).toEqual(['50%']);
    });

    it('survives many progress rewrites without a newline', () => {
        const output = new ModemStreamOutput();
        for (let i = 0; i < 1000; i++) {
            output.push(`${i}%\r`);
        }
        expect(output.lines()).toEqual(['999%']);
        output.push('done\n');
        expect(output.lines()).toEqual(['done']);
    });

    it('returns the lines a push completed', () => {
        const output = new ModemStreamOutput();
        expect(output.push('a\nb')).toEqual(['a']);
        expect(output.push('c\n')).toEqual(['bc']);
        expect(output.push('\n')).toEqual([]);
    });

    it('cleans returned lines', () => {
        const output = new ModemStreamOutput();
        expect(output.push('10%\r50%\r\u001b[1mdone\u001b[0m  \n')).toEqual(['done']);
    });

    it('retains every line', () => {
        const output = new ModemStreamOutput();
        for (let i = 0; i < 1000; i++) {
            output.push(`l${i}\n`);
        }
        expect(output.lines()).toHaveLength(1000);
    });

    it('assembles a long unterminated line in linear time', () => {
        const output = new ModemStreamOutput();
        const chunk = 'x'.repeat(1024);
        const start = performance.now();

        for (let i = 0; i < 4096; i++) {
            output.push(chunk);
        }

        expect(output.push('\n')).toEqual(['x'.repeat(4096 * 1024)]);
        // quadratic re-scanning of the pending line took seconds here
        expect(performance.now() - start).toBeLessThan(1000);
    });

    it('collapses redraws in chunks that carry no newline', () => {
        const output = new ModemStreamOutput();
        output.push('abc');
        output.push('def\r10%');
        output.push('\r50%\r');
        output.push('\n');
        expect(output.lines()).toEqual(['50%']);
    });
});
