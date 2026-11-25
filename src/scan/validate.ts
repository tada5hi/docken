/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScanValidationError } from './error';
import type { MetaType } from './meta';
import type { ScanResultItem } from './result';

/**
 * Run a validator over items sequentially (the first failing item is the
 * deterministic one in sorted input order). The return value replaces
 * `attributes`; without a validator the items are returned unchanged.
 */
export async function validateScanItems<T = Record<string, any>>(
    items: ScanResultItem[],
    type: MetaType,
    validator?: (
        attributes: Record<string, any> | undefined,
        item: ScanResultItem,
    ) => T | Promise<T>,
) : Promise<ScanResultItem<T>[]> {
    if (!validator) {
        return items as ScanResultItem<T>[];
    }

    const output : ScanResultItem<T>[] = [];

    for (const item of items) {
        let attributes : T;

        try {
            attributes = await validator(item.attributes, item);
        } catch (e) {
            throw new ScanValidationError({
                path: item.path, 
                type, 
                cause: e, 
            });
        }

        output.push({ ...item, attributes });
    }

    return output;
}
