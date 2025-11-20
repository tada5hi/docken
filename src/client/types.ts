/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type Docker from 'dockerode';

type Instance<T> = T extends { new(): infer U } ? U : never;
export type Client = Instance<typeof Docker>;

export type ClientOptions = Docker.DockerOptions;
