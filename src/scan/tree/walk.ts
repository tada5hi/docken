/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import fs from 'node:fs';
import { readDirectoryMeta } from '../meta';
import type { ScanNode } from './types';

export async function walkDirectory(directory: string): Promise<ScanNode> {
    const node: ScanNode = {
        name: path.basename(directory),
        meta: await readDirectoryMeta(directory),
        children: [],
    };

    const entries = await fs.promises.opendir(directory, { encoding: 'utf-8' });

    for await (const dirent of entries) {
        if (!dirent.isDirectory()) {
            continue;
        }

        node.children.push(await walkDirectory(path.join(directory, dirent.name)));
    }

    return node;
}
