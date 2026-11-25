/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { ModemStreamWaitOptions } from '../modem';
import { runImageOperation } from './operation';
import type { PullImageInput } from './types';

const DIGEST_PREFIX = 'Digest: ';

/**
 * Pull an image and resolve with its digest, if the daemon reported one.
 */
export async function pullImage(
    client: Client,
    ref: string,
    input: PullImageInput = {},
    options?: ModemStreamWaitOptions,
) : Promise<{ digest?: string }> {
    let digest : string | undefined;

    await runImageOperation(
        client,
        (abortSignal) => client.pull(ref, {
            authconfig: input.authconfig,
            platform: input.platform,
            abortSignal,
        }) as Promise<NodeJS.ReadableStream>,
        options,
        (event) => {
            if (
                event.kind === 'status' &&
                typeof event.chunk.status === 'string' &&
                event.chunk.status.startsWith(DIGEST_PREFIX)
            ) {
                digest = event.chunk.status.slice(DIGEST_PREFIX.length).trim();
            }
        },
    );

    return { digest };
}
