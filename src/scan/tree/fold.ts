/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { distinctArray } from 'smob';
import { MetaType } from '../meta';
import { sortScanResultItemsByPath } from '../result';
import type { ScanResultItem } from '../result';
import type { ScanResult } from '../types';
import type { ScanNode } from './types';

function foldNode(
    node: ScanNode,
    parent: ScanResultItem | undefined,
    root: boolean,
    output: ScanResult,
) {
    let context = parent;

    if (node.meta) {
        const item : ScanResultItem = parent ?
            {
                virtualPath: parent.virtualPath ?
                    path.posix.join(parent.virtualPath, node.name) :
                    node.name,
                path: path.join(parent.path, node.name),
            } :
            {
                virtualPath: node.name,
                path: node.name,
            };

        if (node.meta.attributes !== undefined) {
            item.attributes = {
                ...(parent && parent.attributes ? parent.attributes : {}),
                ...node.meta.attributes,
            };
        } else if (parent && parent.attributes) {
            item.attributes = { ...parent.attributes };
        }

        if (node.meta.type === MetaType.GROUP) {
            output.groups.push(item);

            context = { ...item };
        } else {
            // an image never becomes the parent context of its sub-directories
            output.images.push(item);
        }
    } else if (!root) {
        context = parent ?
            { ...parent, path: path.join(parent.path, node.name) } :
            { path: node.name };
    }

    for (const child of node.children) {
        foldNode(child, context, false, output);
    }
}

export function foldScanTree(root: ScanNode): ScanResult {
    const output : ScanResult = {
        images: [],
        groups: [],
    };

    foldNode(root, undefined, true, output);

    return {
        images: output.images.length > 0 ?
            sortScanResultItemsByPath(distinctArray(output.images)) :
            output.images,

        groups: output.groups.length > 0 ?
            sortScanResultItemsByPath(distinctArray(output.groups)) :
            output.groups,
    };
}
