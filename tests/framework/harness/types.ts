import type { RenderLabDependencies } from '../../../src/common/components/benchmark';
import type { LifecycleLabDependencies } from '../../../src/common/components/lifecycle';
import type { PageBridgeEnvironment } from '../../../src/common/components/pageBridge';

export interface HarnessMountOptions {
    readonly nickname?: string;
    readonly dependencies?: RenderLabDependencies;
    readonly pageBridgeEnvironment?: PageBridgeEnvironment;
    readonly lifecycleDependencies?: LifecycleLabDependencies;
}

export interface ComponentLabHarness {
    readonly framework: string;
    mount(options?: HarnessMountOptions): Promise<void>;
    flush(): Promise<void>;
    resetState(): Promise<void>;
    unmount(): Promise<void>;
    getTarget(): HTMLElement;
}

export type ComponentLabHarnessFactory = () => ComponentLabHarness;
