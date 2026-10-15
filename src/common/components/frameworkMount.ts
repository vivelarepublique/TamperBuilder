import type { RenderLabDependencies } from './benchmark';

export interface FrameworkMountHandle {
    unmount(): void | Promise<void>;
}

export interface FrameworkMountOptions {
    readonly dependencies?: RenderLabDependencies;
}
