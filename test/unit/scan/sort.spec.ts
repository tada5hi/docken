/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { sortScanResultItemsByPath } from '../../../src';

describe('scan > sort', () => {
    it('should sort meta elements (empty array)', () => {
        expect(sortScanResultItemsByPath([])).toHaveLength(0);
    });

    it('should sort meta elements (empty path)', () => {
        const sorted = sortScanResultItemsByPath([
            { path: '' },
            { path: '' },
        ]);

        expect(sorted).toEqual([
            { path: '' },
            { path: '' },
        ]);
    });

    it('should sort meta elements (a < b)', () => {
        const sorted = sortScanResultItemsByPath([
            { path: '' },
            { path: '/path' },
        ]);

        expect(sorted).toEqual([
            { path: '' },
            { path: '/path' },
        ]);
    });

    it('should sort meta elements (a > b)', () => {
        const sorted = sortScanResultItemsByPath([
            { path: '/path' },
            { path: '' },
        ]);

        expect(sorted).toEqual([
            { path: '' },
            { path: '/path' },
        ]);
    });
});
