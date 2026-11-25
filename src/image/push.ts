/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type Docker from 'dockerode';
import type { Client } from '../client';
import type { ModemStreamWaitOptions } from '../modem';
import { runImageOperation } from './operation';
import type { PushImageInput } from './types';

/**
 * Push an image and resolve with the digest and size reported by the daemon.
 */
export async function pushImage(
    client: Client,
    image: string | Docker.Image,
    input: PushImageInput = {},
    options?: ModemStreamWaitOptions,
) : Promise<{ digest?: string, size?: number }> {
    const target = typeof image === 'string' ? client.getImage(image) : image;

    let digest : string | undefined;
    let size : number | undefined;

    await runImageOperation(
        client,
        // eslint-disable-next-line unicorn/no-return-array-push
        (abortSignal) => target.push({
            authconfig: input.authconfig,
            tag: input.tag,
            abortSignal,
        }) as Promise<NodeJS.ReadableStream>,
        options,
        (event) => {
            if (event.kind !== 'aux') {
                return;
            }

            if (typeof event.aux.Digest === 'string') {
                digest = event.aux.Digest;
            }

            if (typeof event.aux.Size === 'number') {
                size = event.aux.Size;
            }
        },
    );

    return { digest, size };
}
