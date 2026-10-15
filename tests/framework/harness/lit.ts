import type { LitElement } from 'lit';
import { createLit } from '../../../src/lit';
import { createHarness } from './createHarness';

async function flushLit(): Promise<void> {
    await Promise.resolve();
    const elements = Array.from(document.querySelectorAll('*')).filter((element): element is LitElement => 'updateComplete' in element);
    await Promise.all(elements.map(element => element.updateComplete));
    await Promise.resolve();
}

export function createLitHarness() {
    return createHarness('lit', createLit, flushLit);
}
