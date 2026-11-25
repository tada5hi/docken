/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import ignore from '@balena/dockerignore';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pack } from 'tar-fs';

const DOCKERIGNORE = '.dockerignore';

type WalkFilter = (entryPath: string) => boolean;

type WalkOutput = {
    files: string[],
    directories: string[],
};

async function walk(
    root: string,
    relative: string,
    output: WalkOutput,
    skipDirectory: WalkFilter,
    signal?: AbortSignal,
) : Promise<void> {
    signal?.throwIfAborted();

    const entries = await fs.promises.readdir(path.join(root, relative), { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = relative ? `${relative}/${entry.name}` : entry.name;

        // symlinks are listed as entries and never followed.
        if (entry.isDirectory()) {
            if (!skipDirectory(entryPath)) {
                output.directories.push(entryPath);

                await walk(root, entryPath, output, skipDirectory, signal);
            }
        } else {
            output.files.push(entryPath);
        }
    }
}

async function readPatterns(context: string) : Promise<string | undefined> {
    try {
        return await fs.promises.readFile(path.join(context, DOCKERIGNORE), 'utf8');
    } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
            return undefined;
        }

        throw e;
    }
}

/**
 * Add the directories without any listed descendant (e.g. empty ones),
 * so the daemon still creates them.
 */
function addEmptyDirectories(entries: string[], directories: string[]) : string[] {
    const parents = new Set<string>();

    // a listed nested directory makes its ancestors non-empty
    for (const entry of [...entries, ...directories]) {
        let index = entry.lastIndexOf('/');

        while (index > 0) {
            parents.add(entry.slice(0, index));
            index = entry.lastIndexOf('/', index - 1);
        }
    }

    for (const directory of directories) {
        if (!parents.has(directory)) {
            entries.push(directory);
        }
    }

    return entries;
}

function hasExceptions(patterns: string) : boolean {
    return patterns.split(/\r?\n/).some((line) => line.trimStart().startsWith('!'));
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
 * List the entries of a build context (relative POSIX paths, sorted),
 * filtered by <context>/.dockerignore: files, symlinks and directories
 * without any listed descendant (e.g. `empty`, without trailing slash).
 * The Dockerfile and .dockerignore are always kept, even if ignored,
 * as the daemon needs them. An aborted signal stops the walk.
 */
export async function listBuildContextFiles(
    context: string,
    dockerfile: string = 'Dockerfile',
    signal?: AbortSignal,
) : Promise<string[]> {
    const patterns = await readPatterns(context);
    const output : WalkOutput = { files: [], directories: [] };

    if (typeof patterns === 'undefined') {
        await walk(context, '', output, () => false, signal);

        return addEmptyDirectories(output.files, output.directories).sort();
    }

    const matcher = ignore({ ignorecase: false }).add(patterns);

    // without exceptions nothing below an excluded directory can be kept,
    // so it is not walked at all.
    const prune = !hasExceptions(patterns);

    await walk(context, '', output, (entryPath) => prune && matcher.ignores(entryPath), signal);

    const result = output.files.filter((file) => !matcher.ignores(file));

    for (const keep of [dockerfile, DOCKERIGNORE]) {
        if (!result.includes(keep) && await exists(path.join(context, keep))) {
            result.push(keep);
        }
    }

    return addEmptyDirectories(
        result,
        output.directories.filter((directory) => !matcher.ignores(directory)),
    ).sort();
}

/**
 * Pack the (filtered) build context directory into a tar stream.
 * No stream is created once the signal aborted.
 */
export async function packBuildContext(
    context: string,
    dockerfile?: string,
    signal?: AbortSignal,
) : Promise<NodeJS.ReadableStream> {
    const entries = await listBuildContextFiles(context, dockerfile, signal);

    signal?.throwIfAborted();

    const allowed = new Set(entries.map((entry) => path.join(context, entry)));

    // a directory entry is read by tar-fs; never re-add excluded children.
    return Readable.from(pack(context, {
        entries,
        ignore: (name) => !allowed.has(name),
    }), { objectMode: false });
}
