import { createSolid } from '../../../src/solid';
import { createHarness } from './createHarness';

export function createSolidHarness() {
    return createHarness('solid', createSolid, async () => {
        await Promise.resolve();
        await new Promise(resolve => setTimeout(resolve, 0));
        await Promise.resolve();
    });
}
