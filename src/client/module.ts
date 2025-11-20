/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Docker from 'dockerode';
import type { ClientOptions } from './types';

export function createClient(options: ClientOptions = {}) {
    return new Docker(options);
}
