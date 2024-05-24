import path from 'node:path';

export const browsers = ['chrome', 'edge', 'firefox'] as const;
export type Browser = (typeof browsers)[number];
export const rootDir = path.join(import.meta.dirname, '..');
