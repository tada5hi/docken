/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Readable } from 'node:stream';
import { vi } from 'vitest';
import type { Client } from '../../src';

export function createFakeClient(
    chunks: Record<string, any>[],
    options: { error?: Error | null, output?: unknown[] } = {},
) {
    const modem = {
        followProgress(
            _stream: unknown,
            onFinished: (e: Error | null, o: unknown[]) => void,
            onProgress?: (c: any) => void,
        ) {
            for (const chunk of chunks) {
                onProgress?.(chunk);
            }

            onFinished(options.error ?? null, options.output ?? chunks);
        },
    };

    const stream = () => new Readable({
        read() {
            this.push(null);
        },
    });

    const pull = vi.fn(async (..._args: any[]) => stream());
    const push = vi.fn(async (..._args: any[]) => stream());
    const buildImage = vi.fn(async (..._args: any[]) => stream());
    const getImage = vi.fn((..._args: any[]) => ({ push }));

    const calls = {
        pull, push, getImage, buildImage,
    };

    const client = {
        modem, pull, getImage, buildImage,
    } as unknown as Client;

    return { client, modem, calls };
}
