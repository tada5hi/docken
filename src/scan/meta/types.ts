/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { MetaType } from './constants';

export type DirectoryMeta = {
    type: MetaType,
    // present exactly when image.json / image-group.json exists and holds a JSON object
    attributes?: Record<string, any>,
};
