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

    it('keeps only the newest lines up to the limit', () => {
        const output = new ModemStreamOutput(2);
        output.push('1\n2\n3\n');
        expect(output.lines()).toEqual(['2', '3']);
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

    it('retains every line by default and with Infinity', () => {
        const output = new ModemStreamOutput();
        const all = new ModemStreamOutput(Infinity);
        for (let i = 0; i < 1000; i++) {
            all.push(`l${i}\n`);
        }
        expect(all.lines()).toHaveLength(1000);
        for (let i = 0; i < 1000; i++) {
            output.push(`l${i}\n`);
        }
        expect(output.lines()).toHaveLength(1000);
    });
});
