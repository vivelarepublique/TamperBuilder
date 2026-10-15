import { tick } from 'svelte';
import { createSvelte } from '../../../src/svelte';
import { createHarness } from './createHarness';

export function createSvelteHarness() {
    return createHarness('svelte', createSvelte, async () => {
        await tick();
        await Promise.resolve();
        await new Promise(resolve => setTimeout(resolve, 0));
        await tick();
    });
}
