/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type Docker from 'dockerode';

export type PullImageInput = {
    authconfig?: Docker.AuthConfig,
    platform?: string,
};

export type PushImageInput = {
    authconfig?: Docker.AuthConfig,
    tag?: string,
};

export type BuildImageInput = Omit<Docker.ImageBuildOptions, 'abortSignal'> & {
    /**
     * Directory (packed honouring .dockerignore) or ready tar stream.
     */
    context: string | NodeJS.ReadableStream,
};
