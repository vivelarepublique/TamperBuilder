import { act } from 'react';
import { createReact } from '../../../src/react';
import type { FrameworkMountHandle, FrameworkMountOptions } from '../../../src/common/components/frameworkMount';
import { createHarness } from './createHarness';

function mountReact(target: HTMLElement, options: FrameworkMountOptions): FrameworkMountHandle {
    let handle: FrameworkMountHandle | undefined;
    act(() => {
        handle = createReact(target, options);
    });
    if (handle === undefined) throw new Error('React did not return a mount handle.');
    const mountedHandle = handle;
    return {
        unmount() {
            act(() => { void mountedHandle.unmount(); });
        },
    };
}

export function createReactHarness() {
    return createHarness('react', mountReact, async () => {
        await act(async () => {
            await Promise.resolve();
        });
    });
}
