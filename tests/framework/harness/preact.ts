import { act } from 'preact/test-utils';
import { createPreact } from '../../../src/preact';
import type { FrameworkMountHandle, FrameworkMountOptions } from '../../../src/common/components/frameworkMount';
import { createHarness } from './createHarness';

async function mountPreact(target: HTMLElement, options: FrameworkMountOptions): Promise<FrameworkMountHandle> {
    let handle: FrameworkMountHandle | undefined;
    await act(() => {
        handle = createPreact(target, options);
    });
    if (handle === undefined) throw new Error('Preact did not return a mount handle.');
    return handle;
}

export function createPreactHarness() {
    return createHarness('preact', mountPreact, async () => {
        await act(async () => {
            await Promise.resolve();
        });
    });
}
