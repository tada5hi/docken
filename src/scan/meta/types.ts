/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { MetaType } from './constants';

export type Meta = {
    path: string,
    virtualPath?: string,
    attributes?: Record<string, any>
};

export type DirectoryMeta = {
    type: MetaType,
    fileExists: boolean,
};
