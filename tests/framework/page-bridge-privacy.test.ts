// @vitest-environment jsdom

import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createLitHarness } from './harness/lit';
import { createPageBridgeSandbox } from './harness/pageBridgeSandbox';
import { createPreactHarness } from './harness/preact';
import { createReactHarness } from './harness/react';
import { createSolidHarness } from './harness/solid';
import { createSvelteHarness } from './harness/svelte';
import type { ComponentLabHarness, ComponentLabHarnessFactory } from './harness/types';
import { createVueHarness } from './harness/vue';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const harnessFactories: readonly ComponentLabHarnessFactory[] = [
    createVueHarness,
    createReactHarness,
    createPreactHarness,
    createLitHarness,
    createSvelteHarness,
    createSolidHarness,
];

function byRole<T extends Element>(root: ParentNode, role: string): T {
    const element = root.querySelector<T>(`[data-ft-role="${role}"]`);
    if (element === null) throw new Error(`Missing data-ft-role=${role}`);
    return element;
}

async function perform(harness: ComponentLabHarness, action: () => void): Promise<void> {
    if (harness.framework === 'react') act(action);
    else action();
    await harness.flush();
}

async function openPageBridge(harness: ComponentLabHarness): Promise<HTMLElement> {
    const target = harness.getTarget();
    await perform(harness, () => byRole<HTMLButtonElement>(target, 'launcher').click());
    await perform(harness, () => byRole<HTMLButtonElement>(target, 'tab-page-bridge').click());
    return target;
}

for (const factory of harnessFactories) {
    const framework = factory().framework;
    describe(`${framework} Page Bridge privacy sandbox`, () => {
        it('keeps values and resources inside the injected root across actions and teardown', async () => {
            const harness = factory();
            const sandbox = createPageBridgeSandbox();
            const original = sandbox.addSearchInput('<private>&value');
            original.classList.add('host-class');
            original.setAttribute('data-ft-showcase-page-bridge-highlight', 'host-token');
            const outside = document.createElement('div');
            outside.id = 'outside-page-bridge-sentinel';
            outside.textContent = 'unchanged sentinel';
            document.body.appendChild(outside);
            const outsideSnapshot = outside.outerHTML;
            const urlSnapshot = location.href;
            const storageSnapshot = JSON.stringify({ ...localStorage });
            const query = vi.spyOn(sandbox.root, 'querySelector');
            const pushState = vi.spyOn(history, 'pushState');
            const replaceState = vi.spyOn(history, 'replaceState');
            const setItem = vi.spyOn(Storage.prototype, 'setItem');
            const fetchSpy = vi.fn(() => Promise.reject(new Error('Network access is forbidden.')));
            vi.stubGlobal('fetch', fetchSpy);
            const openNetwork = vi.spyOn(XMLHttpRequest.prototype, 'open');
            const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
            const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
            const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
            const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

            try {
                await harness.mount({ pageBridgeEnvironment: sandbox.environment });
                const target = await openPageBridge(harness);
                expect(byRole(target, 'page-bridge-current-input').textContent).toBe('<private>&value');
                expect(byRole(target, 'page-bridge-status').textContent).toBe('Target found.');
                expect(query.mock.calls.every(([selector]) => selector === 'input#kw')).toBe(true);
                expect(sandbox.ledger()).toEqual({ observers: 1, timers: 0, listeners: 4 });

                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                expect(original.classList.contains('ft-showcase-page-bridge-highlight')).toBe(true);
                expect(sandbox.ledger().timers).toBe(1);
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-demo').click());
                expect(byRole(target, 'page-bridge-observed-events').querySelector('dd')?.textContent).toBe('1');
                expect(byRole(target, 'page-bridge-last-event').querySelector('dd')?.textContent).toBe('Demo event');

                original.value = 'changed only in fixture';
                await perform(harness, () => original.dispatchEvent(new Event('input', { bubbles: true })));
                expect(byRole(target, 'page-bridge-current-input').textContent).toBe('changed only in fixture');
                expect(byRole(target, 'page-bridge-observed-events').querySelector('dd')?.textContent).toBe('2');

                const replacement = sandbox.replaceSearchInput('replacement secret');
                sandbox.fireMutation();
                await harness.flush();
                expect(byRole(target, 'page-bridge-current-input').textContent).toBe('replacement secret');
                expect(original.classList.contains('host-class')).toBe(true);
                expect(original.classList.contains('ft-showcase-page-bridge-highlight')).toBe(false);
                expect(original.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-token');
                const count = byRole(target, 'page-bridge-observed-events').querySelector('dd')?.textContent;
                original.dispatchEvent(new Event('input'));
                expect(byRole(target, 'page-bridge-observed-events').querySelector('dd')?.textContent).toBe(count);

                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                expect(replacement.classList.contains('ft-showcase-page-bridge-highlight')).toBe(true);
                sandbox.runTimers();
                expect(replacement.classList.contains('ft-showcase-page-bridge-highlight')).toBe(false);

                await perform(harness, () => target.querySelector<HTMLButtonElement>('[aria-label="Close component lab"]')?.click());
                expect(sandbox.ledger()).toEqual({ observers: 0, timers: 0, listeners: 0 });
                sandbox.fireLateMutation();
                await harness.flush();

                await openPageBridge(harness);
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                const retainedStatus = byRole(target, 'page-bridge-status');
                await harness.unmount();
                expect(sandbox.ledger()).toEqual({ observers: 0, timers: 0, listeners: 0 });
                sandbox.fireLateMutation();
                sandbox.runTimers();
                expect(retainedStatus.textContent).toBe('Target focused and highlighted.');

                expect(outside.outerHTML).toBe(outsideSnapshot);
                expect(location.href).toBe(urlSnapshot);
                expect(JSON.stringify({ ...localStorage })).toBe(storageSnapshot);
                expect(pushState).not.toHaveBeenCalled();
                expect(replaceState).not.toHaveBeenCalled();
                expect(setItem).not.toHaveBeenCalled();
                expect(fetchSpy).not.toHaveBeenCalled();
                expect(openNetwork).not.toHaveBeenCalled();
                const consolePayload = [...log.mock.calls, ...info.mock.calls, ...warn.mock.calls, ...error.mock.calls].flat().join(' ');
                expect(consolePayload).not.toContain('private');
                expect(consolePayload).not.toContain('secret');
            } finally {
                await harness.unmount();
                sandbox.dispose();
                outside.remove();
                query.mockRestore();
                pushState.mockRestore();
                replaceState.mockRestore();
                setItem.mockRestore();
                openNetwork.mockRestore();
                log.mockRestore();
                info.mockRestore();
                warn.mockRestore();
                error.mockRestore();
                vi.unstubAllGlobals();
            }
        });
    });
}
