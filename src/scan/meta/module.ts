/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject, load } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import { MetaFileName, MetaType } from './constants';

import type { DirectoryMeta } from './types';

async function loadJSONRecord(filePath: string) {
    const content = await load(filePath);
    /* istanbul ignore next */
    if (!isObject(content)) {
        throw new Error('The file content could not be read.');
    }

    return content;
}

export async function detectDirectoryMeta(
    directory: string,
): Promise<DirectoryMeta | undefined> {
    try {
        await fs.promises.access(
            path.join(directory, MetaFileName.IMAGE),
            fs.constants.F_OK | fs.constants.R_OK,
        );

        return { type: MetaType.IMAGE, fileExists: true };
    } catch (e) {
        // don't do anything
    }

    try {
        await fs.promises.access(
            path.join(directory, MetaFileName.GROUP),
            fs.constants.F_OK | fs.constants.R_OK,
        );

        return { type: MetaType.GROUP, fileExists: true };
    } catch (e) {
        // don't do anything
    }

    try {
        await fs.promises.access(
            path.join(directory, 'Dockerfile'),
            fs.constants.F_OK | fs.constants.R_OK,
        );
        return { type: MetaType.IMAGE, fileExists: false };
    } catch (e) {
        // don't do anything
    }

    return undefined;
}

export async function readMetaFile(
    directory: string,
    type: MetaType,
) : Promise<Record<string, any>> {
    if (type === MetaType.IMAGE) {
        return loadJSONRecord(path.join(directory, MetaFileName.IMAGE));
    }

    return loadJSONRecord(path.join(directory, MetaFileName.GROUP));
}
