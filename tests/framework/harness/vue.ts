import { nextTick } from 'vue';
import { createVue } from '../../../src/vue';
import { createHarness } from './createHarness';

export function createVueHarness() {
    return createHarness('vue', createVue, async () => {
        await nextTick();
        await nextTick();
    });
}
