/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import ignore from '@balena/dockerignore';
import fs from 'node:fs';
import path from 'node:path';
import { pack } from 'tar-fs';

const DOCKERIGNORE = '.dockerignore';

async function walk(root: string, relative: string, output: string[]) : Promise<void> {
    const entries = await fs.promises.readdir(path.join(root, relative), { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = relative ? `${relative}/${entry.name}` : entry.name;

        // symlinks are listed as entries and never followed.
        if (entry.isDirectory()) {
            await walk(root, entryPath, output);
        } else {
            output.push(entryPath);
        }
    }
}

async function exists(file: string) : Promise<boolean> {
    try {
        await fs.promises.lstat(file);

        return true;
    } catch (e) {
        return false;
    }
}

/**
 * List the files of a build context (relative POSIX paths, sorted),
 * filtered by <context>/.dockerignore. The Dockerfile and .dockerignore
 * are always kept, even if ignored, as the daemon needs them.
 */
export async function listBuildContextFiles(
    context: string,
    dockerfile: string = 'Dockerfile',
) : Promise<string[]> {
    const files : string[] = [];

    await walk(context, '', files);

    let patterns : string | undefined;

    try {
        patterns = await fs.promises.readFile(path.join(context, DOCKERIGNORE), 'utf8');
    } catch (e) {
        return files.sort();
    }

    const matcher = ignore({ ignorecase: false }).add(patterns);
    const result = files.filter((file) => !matcher.ignores(file));

    for (const keep of [dockerfile, DOCKERIGNORE]) {
        if (!result.includes(keep) && await exists(path.join(context, keep))) {
            result.push(keep);
        }
    }

    return result.sort();
}

/**
 * Pack the (filtered) build context directory into a tar stream.
 */
export async function packBuildContext(
    context: string,
    dockerfile?: string,
) : Promise<NodeJS.ReadableStream> {
    const entries = await listBuildContextFiles(context, dockerfile);

    return pack(context, { entries });
}
