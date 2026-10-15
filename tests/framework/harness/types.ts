import type { RenderLabDependencies } from '../../../src/common/components/benchmark';

export interface HarnessMountOptions {
    readonly nickname?: string;
    readonly dependencies?: RenderLabDependencies;
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
