import type { FrameworkMountHandle, FrameworkMountOptions } from '../../../src/common/components/frameworkMount';
import type { ComponentLabHarness, HarnessMountOptions } from './types';

export function createHarness(
    framework: string,
    mountFramework: (target: HTMLElement, options: FrameworkMountOptions) => FrameworkMountHandle | Promise<FrameworkMountHandle>,
    flushFramework: () => Promise<void>,
): ComponentLabHarness {
    let handle: FrameworkMountHandle | null = null;
    let target: HTMLElement | null = null;
    let latestOptions: HarnessMountOptions = {};

    async function unmount(): Promise<void> {
        const mountedHandle = handle;
        const mountedTarget = target;
        handle = null;
        target = null;
        if (mountedHandle !== null) await mountedHandle.unmount();
        mountedTarget?.remove();
    }

    async function mount(options: HarnessMountOptions = {}): Promise<void> {
        if (handle !== null) await unmount();
        latestOptions = options;
        target = document.createElement('div');
        target.id = `${options.nickname ?? framework}App`;
        document.body.appendChild(target);
        handle = await mountFramework(target, {
            dependencies: options.dependencies,
            pageBridgeEnvironment: options.pageBridgeEnvironment,
            lifecycleDependencies: options.lifecycleDependencies,
        });
        await flushFramework();
    }

    return {
        framework,
        mount,
        flush: flushFramework,
        async resetState() {
            await unmount();
            await mount(latestOptions);
        },
        unmount,
        getTarget() {
            if (target === null) throw new Error(`${framework} harness is not mounted.`);
            return target;
        },
    };
}
