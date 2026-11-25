/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    MetaType,
    ScanValidationError,
    isScanValidationError,
    scanDirectory,
} from '../../../src';

const nested = 'test/data/scan-cases/nested-image';

describe('scan validation', () => {
    it('passes merged attributes and the item to validators', async () => {
        const seen: any[] = [];
        const result = await scanDirectory(nested, {
            validate: {
                image: (attributes, item) => {
                    seen.push([item.path, attributes?.license]);

                    return attributes as any;
                },
            },
        });

        expect(result.images.length).toBe(2);
        expect(seen).toContainEqual(['group/outer', 'MIT']);
        expect(seen).toContainEqual(['group/inner', 'MIT']);
    });

    it('replaces attributes with the (async) return value', async () => {
        const result = await scanDirectory(nested, {
            validate: {
                image: async (attributes) => ({ license: attributes?.license as string }),
                group: () => ({ marker: true }),
            },
        });

        expect(result.images.map((i) => i.attributes)).toEqual([{ license: 'MIT' }, { license: 'MIT' }]);
        expect(result.groups.map((g) => g.attributes)).toEqual([{ marker: true }]);
    });

    it('rejects with ScanValidationError when a validator throws', async () => {
        const failure = new Error('bad');
        const error = await scanDirectory(nested, {
            validate: {
                image: (_attributes, item) => {
                    if (item.path === 'group/outer') {
                        throw failure;
                    }

                    return {};
                },
            },
        }).catch((e) => e);

        expect(error).toBeInstanceOf(ScanValidationError);
        expect(error.path).toBe('group/outer');
        expect(error.type).toBe(MetaType.IMAGE);
        expect(error.cause).toBe(failure);
        expect(error.name).toBe('ScanValidationError');
        expect(error.message).toBe('The image at group/outer has invalid attributes.');
    });

    it('fails on the first item in sorted order', async () => {
        const order: string[] = [];
        const error = await scanDirectory(nested, {
            validate: {
                image: (_a, item) => {
                    order.push(item.path);

                    throw new Error(item.path);
                },
            },
        }).catch((e) => e);

        expect(order).toEqual(['group/inner']);
        expect(error.path).toBe('group/inner');
    });

    it('leaves attributes unchanged without a validator for the type', async () => {
        const plain = await scanDirectory(nested);
        const result = await scanDirectory(nested, { validate: { group: () => ({ x: 1 }) } });

        expect(result.images).toEqual(plain.images);
        expect(result.groups).not.toEqual(plain.groups);
    });

    it('detects errors across module copies', () => {
        expect(isScanValidationError({
            name: 'ScanValidationError', 
            path: 'x', 
            message: '', 
        })).toBe(true);
        expect(isScanValidationError(new Error('x'))).toBe(false);
        expect(isScanValidationError({ name: 'ScanValidationError' })).toBe(false);
    });
});
