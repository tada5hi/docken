/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { ModemStreamWaitOptions } from '../modem';
import { packBuildContext } from './context';
import { runImageOperation } from './operation';
import type { BuildImageInput } from './types';

/**
 * Build an image from a context directory (packed honouring .dockerignore)
 * or a ready tar stream, and resolve with the last reported image id.
 */
export async function buildImage(
    client: Client,
    input: BuildImageInput,
    options?: ModemStreamWaitOptions,
) : Promise<{ imageId?: string }> {
    const { context, ...buildOptions } = input;
    let imageId : string | undefined;

    await runImageOperation(
        client,
        async (abortSignal) => {
            const tar = typeof context === 'string' ?
                await packBuildContext(context, buildOptions.dockerfile) :
                context;

            return client.buildImage(tar as any, {
                ...buildOptions,
                abortSignal,
            } as any) as unknown as Promise<NodeJS.ReadableStream>;
        },
        options,
        (event) => {
            if (event.kind === 'aux' && typeof event.aux.ID === 'string') {
                imageId = event.aux.ID;
            }
        },
    );

    return { imageId };
}
