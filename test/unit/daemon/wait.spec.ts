/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it, vi } from 'vitest';
import { waitForDaemon } from '../../../src';

describe('waitForDaemon', () => {
    it('resolves once ping succeeds', async () => {
        const ping = vi.fn()
            .mockRejectedValueOnce(new Error('1'))
            .mockRejectedValueOnce(new Error('2'))
            .mockResolvedValueOnce('OK');

        await expect(waitForDaemon({ ping }, { interval: 1 })).resolves.toBeUndefined();
        expect(ping).toHaveBeenCalledTimes(3);
    });

    it('rejects after retries with the last error as cause', async () => {
        const last = new Error('3');
        const ping = vi.fn()
            .mockRejectedValueOnce(new Error('1'))
            .mockRejectedValueOnce(new Error('2'))
            .mockRejectedValueOnce(last);

        const error = await waitForDaemon({ ping }, { retries: 2, interval: 1 }).catch((e) => e);
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('The docker daemon is not reachable.');
        expect(error.cause).toBe(last);
        expect(ping).toHaveBeenCalledTimes(3);
    });

    it('rejects with the abort reason', async () => {
        const ping = vi.fn().mockRejectedValue(new Error('down'));
        const controller = new AbortController();
        const reason = new Error('stop');

        const promise = waitForDaemon({ ping }, { interval: 1000, signal: controller.signal });
        setTimeout(() => controller.abort(reason), 10);

        await expect(promise).rejects.toBe(reason);
    });
});
