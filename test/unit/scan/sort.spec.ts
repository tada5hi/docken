import { sortMetaElementsByPath } from '../../../src/scan/meta/sort';

describe('scan > sort', () => {
    it('should sort meta elements (empty array)', () => {
        expect(sortMetaElementsByPath([])).toHaveLength(0);
    });

    it('should sort meta elements (empty path)', () => {
        const sorted = sortMetaElementsByPath([
            { path: '' },
            { path: '' },
        ]);

        expect(sorted).toEqual([
            { path: '' },
            { path: '' },
        ]);
    });

    it('should sort meta elements (a < b)', () => {
        const sorted = sortMetaElementsByPath([
            { path: '' },
            { path: '/path' },
        ]);

        expect(sorted).toEqual([
            { path: '' },
            { path: '/path' },
        ]);
    });

    it('should sort meta elements (a > b)', () => {
        const sorted = sortMetaElementsByPath([
            { path: '/path' },
            { path: '' },
        ]);

        expect(sorted).toEqual([
            { path: '' },
            { path: '/path' },
        ]);
    });
});
