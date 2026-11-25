/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';

describe('public exports', () => {
    it('keeps internal helpers private', async () => {
        const api = await import('../../src');

        for (const name of [
            'listBuildContextFiles',
            'packBuildContext',
            'createAbortSignal',
            'createModemStreamAbortError',
            'validateScanItems',
        ]) {
            expect(api).not.toHaveProperty(name);
        }
    });

    it('exposes the documented additions', async () => {
        const api = await import('../../src');

        for (const name of [
            'waitForDaemon',
            'buildImage',
            'pullImage',
            'pushImage',
            'readStream',
            'readModemStream',
            'scanDirectoryTree',
            'isModemStreamError',
            'isScanValidationError',
        ]) {
            expect(api).toHaveProperty(name);
        }
    });
});
