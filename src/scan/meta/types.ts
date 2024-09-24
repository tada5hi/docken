import type { MetaType } from './constants';

export type Meta = {
    path: string,
    virtualPath?: string,
    attributes?: Record<string, any>
};

export type DirectoryMeta = {
    type: MetaType,
    fileExists: boolean,
};
