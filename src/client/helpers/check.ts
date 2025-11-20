/*
 * Copyright (c) 2025-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Docker from 'dockerode';
import { isObject } from 'smob';
import type { Client } from '../types';

export function isClient(input: unknown) : input is Client {
    return isObject(input) && input instanceof Docker;
}
