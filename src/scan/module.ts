/*
 * Copyright (c) 2021-2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import fs from 'node:fs';
import { distinctArray } from 'smob';
import { sortMetaElementsByPath } from './meta/sort';
import type {
    ScanResult,
} from './types';
import type { Meta } from './meta';
import {
    MetaType, detectDirectoryMeta, readMetaFile,
} from './meta';

type DirectoryScanContext = {
    cwd: string,
    parent?: Meta,
    root?: boolean
};
async function scanDirectoryInternal(ctx: DirectoryScanContext) {
    const output : ScanResult = {
        images: [],
        groups: [],
    };

    const directoryName = path.basename(ctx.cwd);
    const directoryMeta = await detectDirectoryMeta(ctx.cwd);
    if (directoryMeta) {
        let meta : Meta;
        if (ctx.parent) {
            meta = {
                virtualPath: ctx.parent.virtualPath ?
                    path.posix.join(ctx.parent.virtualPath, directoryName) :
                    directoryName,
                path: path.join(ctx.parent.path, directoryName),
            };
        } else {
            meta = {
                virtualPath: directoryName,
                path: directoryName,
            };
        }

        if (directoryMeta.fileExists) {
            meta.attributes = {
                ...(ctx.parent && ctx.parent.attributes ? ctx.parent.attributes : {}),
                ...await readMetaFile(
                    ctx.cwd,
                    directoryMeta.type,
                ),
            };
        } else if (ctx.parent && ctx.parent.attributes) {
            meta.attributes = {
                ...ctx.parent.attributes,
            };
        }

        if (directoryMeta.type === MetaType.GROUP) {
            output.groups.push(meta);

            ctx.parent = {
                ...meta,
            };
        } else {
            output.images.push(meta);
        }
    } else if (!ctx.root) {
        if (ctx.parent) {
            ctx.parent = {
                ...ctx.parent,
                path: path.join(ctx.parent.path, directoryName),
            };
        } else {
            ctx.parent = {
                path: directoryName,
            };
        }
    }

    ctx.root = false;

    const entries = await fs.promises.opendir(ctx.cwd, { encoding: 'utf-8' });

    // eslint-disable-next-line no-restricted-syntax
    for await (const dirent of entries) {
        if (!dirent.isDirectory()) {
            continue;
        }

        const childOutput = await scanDirectoryInternal({
            ...ctx,
            cwd: path.join(ctx.cwd, dirent.name),
        });

        if (childOutput.images.length > 0) {
            output.images.push(...childOutput.images);
        }

        if (childOutput.groups.length > 0) {
            output.groups.push(...childOutput.groups);
        }
    }

    return output;
}

export async function scanDirectory(
    cwd: string,
) : Promise<ScanResult> {
    const output = await scanDirectoryInternal({
        cwd,
        root: true,
    });

    return {
        images: output.images.length > 0 ?
            sortMetaElementsByPath(distinctArray(output.images)) :
            output.images,

        groups: output.groups.length > 0 ?
            sortMetaElementsByPath(distinctArray(output.groups)) :
            output.groups,
    };
}
