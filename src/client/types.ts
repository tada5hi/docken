import type Docker from 'dockerode';

type Instance<T> = T extends { new(): infer U } ? U : never;
export type Client = Instance<typeof Docker>;
