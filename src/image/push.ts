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

// e.g. "v1: digest: sha256:45e0…9e1d size: 1026"
const PUSH_DIGEST_STATUS_REGEX = /digest: (sha256:[a-f0-9]{64}) size: (\d+)/;

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

    // the containerd image store reports the digest only in the status line
    let statusDigest : string | undefined;
    let statusSize : number | undefined;

    await runImageOperation(
        client,
        // eslint-disable-next-line unicorn/no-return-array-push -- Image.push is a docker push, not Array.prototype.push
        (abortSignal) => target.push({
            authconfig: input.authconfig,
            tag: input.tag,
            abortSignal,
        }) as Promise<NodeJS.ReadableStream>,
        options,
        (event) => {
            if (event.kind === 'status') {
                const match = PUSH_DIGEST_STATUS_REGEX.exec(event.chunk.status);

                if (match) {
                    statusDigest = match[1];
                    statusSize = Number(match[2]);
                }

                return;
            }

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

    if (digest === undefined) {
        digest = statusDigest;
        size ??= statusSize;
    }

    return { digest, size };
}
