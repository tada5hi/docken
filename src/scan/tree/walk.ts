/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import fs from 'node:fs';
import { readDirectoryMeta } from '../meta';
import type { ScanNode, WalkOptions } from './types';

const DEFAULT_IGNORE = ['.git', 'node_modules'];

async function walk(
    directory: string,
    ignore: string[],
    maxDepth: number,
    depth: number,
): Promise<ScanNode> {
    const node: ScanNode = {
        name: path.basename(directory),
        meta: await readDirectoryMeta(directory),
        children: [],
    };

    if (depth >= maxDepth) {
        return node;
    }

    // list first and hold no handle while children are walked;
    // symlinked directories are not followed, as isDirectory() is false for them
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    const directories = entries.filter((dirent) => dirent.isDirectory() && !ignore.includes(dirent.name));

    // every child promise gets its handler in the tick it starts
    const children = directories.map((dirent) => walk(
        path.join(directory, dirent.name),
        ignore,
        maxDepth,
        depth + 1,
    ));

    node.children = await Promise.all(children);

    return node;
}

export async function walkDirectory(
    directory: string,
    options: WalkOptions = {},
): Promise<ScanNode> {
    return walk(
        directory,
        options.ignore ?? DEFAULT_IGNORE,
        options.maxDepth ?? Infinity,
        0,
    );
}
