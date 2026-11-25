/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type Docker from 'dockerode';
import { isObject } from 'smob';
import type { Client } from '../client';
import type { ModemStreamWaitOptions } from '../modem';
import { runImageOperation } from './operation';
import type { PushImageInput } from './types';

// "<tag>: digest: <algorithm>:<hex> size: <bytes>", e.g. "v1: digest: sha256:45e0…9e1d size: 1026"
const PUSH_DIGEST_STATUS_REGEX = /^(\S+): digest: ([a-z0-9]+(?:[+._-][a-z0-9]+)*:[a-f0-9]{32,}) size: (\d+)$/i;

type PushResult = { digest?: string, size?: number };

function readDigest(input: unknown) : string | undefined {
    return typeof input === 'string' && input.length > 0 ? input : undefined;
}

function readSize(input: unknown) : number | undefined {
    return typeof input === 'number' && Number.isFinite(input) ? input : undefined;
}

/**
 * Push an image and resolve with the digest and size reported by the daemon.
 *
 * Sources, most structured first:
 * 1. the aux chunk `{ Tag, Digest, Size }` (classic image store),
 * 2. the aux chunk `{ selectedManifest: { digest, size } }` (containerd image store),
 * 3. the final status line "<tag>: digest: <digest> size: <size>".
 * With `input.tag` set, sources naming another tag are ignored.
 */
export async function pushImage(
    client: Client,
    image: string | Docker.Image,
    input: PushImageInput = {},
    options?: ModemStreamWaitOptions,
) : Promise<PushResult> {
    const target = typeof image === 'string' ? client.getImage(image) : image;

    const legacy : PushResult = {};
    const manifest : PushResult = {};
    const status : PushResult = {};

    const isOtherTag = (tag: unknown) => input.tag !== undefined &&
        typeof tag === 'string' &&
        tag !== input.tag;

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
                const match = PUSH_DIGEST_STATUS_REGEX.exec(event.chunk.status.trim());

                if (match && !isOtherTag(match[1])) {
                    status.digest = match[2];
                    status.size = Number(match[3]);
                }

                return;
            }

            if (event.kind !== 'aux' || isOtherTag(event.aux.Tag)) {
                return;
            }

            const digest = readDigest(event.aux.Digest);

            if (digest) {
                legacy.digest = digest;
                legacy.size = readSize(event.aux.Size);
            }

            const selected : unknown = event.aux.selectedManifest;

            if (!isObject(selected) || !readDigest(selected.digest)) {
                return;
            }

            manifest.digest = readDigest(selected.digest);
            manifest.size = readSize(selected.size);
        },
    );

    const sources = [legacy, manifest, status];
    const source = sources.find((item) => item.digest !== undefined);

    if (!source) {
        return { digest: undefined, size: undefined };
    }

    return {
        digest: source.digest,
        // the size of the same manifest; another source only fills a gap when it reports the same digest
        size: source.size ?? sources.find((item) => item.digest === source.digest && item.size !== undefined)?.size,
    };
}
