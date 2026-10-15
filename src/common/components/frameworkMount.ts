import type { RenderLabDependencies } from './benchmark';
import type { LifecycleLabDependencies } from './lifecycle';
import type { PageBridgeEnvironment } from './pageBridge';

export interface FrameworkMountHandle {
    unmount(): void | Promise<void>;
}

export interface FrameworkMountOptions {
    readonly dependencies?: RenderLabDependencies;
    readonly pageBridgeEnvironment?: PageBridgeEnvironment;
    readonly lifecycleDependencies?: LifecycleLabDependencies;
}
