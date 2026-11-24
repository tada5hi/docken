/*
 * Copyright (c) 2021-2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'locter';
import { isObject } from 'smob';
import fs from 'node:fs';
import path from 'node:path';
import { MetaFileName, MetaType } from './constants';

import type { DirectoryMeta } from './types';

async function loadJSONRecord(filePath: string) {
    const content : unknown = await read(filePath);

    if (!isObject(content)) {
        throw new Error('The file content could not be read.');
    }

    return content;
}

async function isReadable(filePath: string) : Promise<boolean> {
    try {
        await fs.promises.access(
            filePath,
            fs.constants.F_OK | fs.constants.R_OK,
        );

        return true;
    } catch (e) {
        return false;
    }
}

export async function readDirectoryMeta(
    directory: string,
): Promise<DirectoryMeta | undefined> {
    const imageFile = path.join(directory, MetaFileName.IMAGE);

    if (await isReadable(imageFile)) {
        return { type: MetaType.IMAGE, attributes: await loadJSONRecord(imageFile) };
    }

    const groupFile = path.join(directory, MetaFileName.GROUP);

    if (await isReadable(groupFile)) {
        return { type: MetaType.GROUP, attributes: await loadJSONRecord(groupFile) };
    }

    if (await isReadable(path.join(directory, 'Dockerfile'))) {
        return { type: MetaType.IMAGE };
    }

    return undefined;
}
