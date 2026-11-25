/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { scanDirectory } from '../../../src';

describe('walkDirectory', () => {
    let tmp: string;

    beforeEach(async () => {
        tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'docken-walk-'));
    });

    afterEach(async () => {
        await fs.rm(tmp, { recursive: true, force: true });
    });

    it('rejects without an unhandled rejection when an early child fails', async () => {
        // many siblings, so listing the parent spans several reads
        for (let i = 0; i < 300; i++) {
            const dir = path.join(tmp, `d${i}`);

            await fs.mkdir(dir);
            await fs.writeFile(path.join(dir, 'image.json'), '{ invalid');
        }

        const spy = vi.fn();

        process.on('unhandledRejection', spy);

        try {
            await expect(scanDirectory(tmp)).rejects.toThrow();

            await new Promise((resolve) => {
                setTimeout(resolve, 50);
            });

            expect(spy).not.toHaveBeenCalled();
        } finally {
            process.off('unhandledRejection', spy);
        }
    });
});
