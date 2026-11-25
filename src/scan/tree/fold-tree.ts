/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { distinctArray } from 'smob';
import { MetaType } from '../meta';
import type { DirectoryMeta } from '../meta';
import { sortScanResultItemsByPath } from '../result';
import type { ScanResultItem } from '../result';
import { createPlainScanContext, createScanItem } from './fold';
import type { ScanNode, ScanTreeItem } from './types';

function foldNode(
    node: ScanNode,
    parent: ScanResultItem | undefined,
    siblings: ScanTreeItem[],
    root: boolean,
) {
    let context = parent;
    let target = siblings;

    if (node.meta) {
        const item = createScanItem(node as ScanNode & { meta: DirectoryMeta }, parent);
        const treeItem : ScanTreeItem = {
            ...item,
            type: node.meta.type,
            children: [],
        };

        siblings.push(treeItem);

        if (node.meta.type === MetaType.GROUP) {
            context = { ...item };
            target = treeItem.children;
        }
    } else if (!root) {
        context = createPlainScanContext(node, parent);
    }

    for (const child of node.children) {
        foldNode(child, context, target, false);
    }
}

function sortTree(items: ScanTreeItem[]) {
    // same dedupe as the flat scan (foldScanTree)
    sortScanResultItemsByPath(distinctArray(items));

    for (const item of items) {
        sortTree(item.children);
    }

    return items;
}

/**
 * Fold a walked tree into nested items, using the same path, virtualPath
 * and attribute rules as foldScanTree. Items attach to the nearest group
 * ancestor; an image never becomes a parent.
 */
export function foldScanTreeItems(root: ScanNode) : ScanTreeItem[] {
    const output : ScanTreeItem[] = [];

    foldNode(root, undefined, output, true);

    return sortTree(output);
}
