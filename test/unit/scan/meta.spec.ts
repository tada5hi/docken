/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { MetaType, readDirectoryMeta } from '../../../src';

describe('readDirectoryMeta', () => {
    it('should read image meta with attributes', async () => {
        const result = await readDirectoryMeta('test/data/scan/group/image');

        expect(result).toEqual({ type: MetaType.IMAGE, attributes: { name: 'Cool image' } });
    });

    it('should read group meta with attributes', async () => {
        const result = await readDirectoryMeta('test/data/scan/group');

        expect(result).toEqual({
            type: MetaType.GROUP,
            attributes: { name: 'Group', license: 'MIT' },
        });
    });

    it('should return an image without attributes for a Dockerfile only directory', async () => {
        const result = await readDirectoryMeta('test/data/scan/image');

        expect(result).toEqual({ type: MetaType.IMAGE });
        expect(result).toBeDefined();
        expect('attributes' in (result as object)).toBe(false);
    });

    it('should return undefined for a plain directory', async () => {
        const result = await readDirectoryMeta('test/data/scan/group/undefined');

        expect(result).toBeUndefined();
    });

    it('should prefer image.json over image-group.json', async () => {
        const result = await readDirectoryMeta('test/data/scan-cases/precedence/both-files');

        expect(result).toEqual({ type: MetaType.IMAGE, attributes: { name: 'Image' } });
    });

    it('should prefer image-group.json over a Dockerfile', async () => {
        const result = await readDirectoryMeta('test/data/scan-cases/precedence/group-with-dockerfile');

        expect(result?.type).toEqual(MetaType.GROUP);
    });

    it('should reject for invalid meta content', async () => {
        await expect(readDirectoryMeta('test/data/scan-cases/invalid/image'))
            .rejects.toThrow('The file content could not be read.');
    });
});
