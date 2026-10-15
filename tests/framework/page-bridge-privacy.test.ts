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

const cleanLedger = { observers: 0, timers: 0, listeners: 0 };
const activeLedger = { observers: 1, timers: 0, listeners: 4 };
const orderedCleanup = [
    'observer:disconnect',
    'listener:custom:remove:kwChanged',
    'listener:target:remove:input',
    'listener:target:remove:change',
    'listener:target:remove:tamper-builder:page-bridge-demo',
    'timer:clear',
    'highlight:set:host-token',
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

function capturePrivacyBoundary(outside: HTMLElement, sensitiveValues: readonly string[]) {
    const outsideSnapshot = outside.outerHTML;
    const urlSnapshot = location.href;
    const historyLengthSnapshot = history.length;
    const cookieSnapshot = document.cookie;
    const localStorageSnapshot = JSON.stringify({ ...localStorage });
    const sessionStorageSnapshot = JSON.stringify({ ...sessionStorage });
    const pushState = vi.spyOn(history, 'pushState');
    const replaceState = vi.spyOn(history, 'replaceState');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    const clear = vi.spyOn(Storage.prototype, 'clear');
    const fetchSpy = vi.fn(() => Promise.reject(new Error('Network access is forbidden.')));
    vi.stubGlobal('fetch', fetchSpy);
    const openNetwork = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const gmRequest = vi.fn();
    vi.stubGlobal('GM_xmlhttpRequest', gmRequest);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    return {
        assertUnchanged() {
            expect(outside.outerHTML).toBe(outsideSnapshot);
            expect(location.href).toBe(urlSnapshot);
            expect(history.length).toBe(historyLengthSnapshot);
            expect(document.cookie).toBe(cookieSnapshot);
            expect(JSON.stringify({ ...localStorage })).toBe(localStorageSnapshot);
            expect(JSON.stringify({ ...sessionStorage })).toBe(sessionStorageSnapshot);
            expect(pushState).not.toHaveBeenCalled();
            expect(replaceState).not.toHaveBeenCalled();
            expect(setItem).not.toHaveBeenCalled();
            expect(removeItem).not.toHaveBeenCalled();
            expect(clear).not.toHaveBeenCalled();
            expect(fetchSpy).not.toHaveBeenCalled();
            expect(openNetwork).not.toHaveBeenCalled();
            expect(gmRequest).not.toHaveBeenCalled();
            const consolePayload = [...log.mock.calls, ...info.mock.calls, ...warn.mock.calls, ...error.mock.calls].flat().join(' ');
            for (const value of sensitiveValues) expect(consolePayload).not.toContain(value);
        },
        restore() {
            vi.restoreAllMocks();
            vi.unstubAllGlobals();
        },
    };
}

function createOutsideSentinel(): HTMLElement {
    const outside = document.createElement('div');
    outside.id = 'outside-page-bridge-sentinel';
    outside.setAttribute('data-host-state', 'unchanged');
    outside.textContent = 'unchanged sentinel';
    document.body.appendChild(outside);
    return outside;
}

async function assertLateCallbacksAreRejected(
    harness: ComponentLabHarness,
    status: HTMLElement,
    statusSnapshot: string,
    input: HTMLInputElement,
    sandbox: ReturnType<typeof createPageBridgeSandbox>,
): Promise<void> {
    sandbox.fireLateMutation();
    sandbox.fireLateTimer();
    sandbox.fireCustomEvent();
    input.dispatchEvent(new Event('input'));
    await harness.flush();
    expect(status.textContent).toBe(statusSnapshot);
    expect(sandbox.ledger()).toEqual(cleanLedger);
}

for (const factory of harnessFactories) {
    const framework = factory().framework;
    describe(`${framework} Page Bridge privacy sandbox`, () => {
        it('keeps all normal and recoverable action paths root-scoped and reversible', async () => {
            const harness = factory();
            const sandbox = createPageBridgeSandbox();
            const original = sandbox.addSearchInput('<private>&value');
            original.classList.add('host-class');
            original.setAttribute('data-ft-showcase-page-bridge-highlight', 'host-token');
            const outside = createOutsideSentinel();
            const privacy = capturePrivacyBoundary(outside, ['private', 'changed only in fixture', 'replacement secret']);
            const query = vi.spyOn(sandbox.root, 'querySelector');

            try {
                await harness.mount({ pageBridgeEnvironment: sandbox.environment });
                const target = await openPageBridge(harness);
                expect(byRole(target, 'page-bridge-current-input').textContent).toBe('<private>&value');
                expect(byRole(target, 'page-bridge-status').textContent).toBe('Target found.');
                expect(sandbox.ledger()).toEqual(activeLedger);

                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-refresh').click());
                original.value = 'changed only in fixture';
                await perform(harness, () => original.dispatchEvent(new Event('input', { bubbles: true })));
                sandbox.fireCustomEvent();
                await harness.flush();
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-demo').click());
                expect(byRole(target, 'page-bridge-observed-events').querySelector('dd')?.textContent).toBe('3');
                expect(byRole(target, 'page-bridge-last-event').querySelector('dd')?.textContent).toBe('Demo event');

                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                expect(original.getAttribute('data-ft-showcase-page-bridge-highlight')).toMatch(/^tamper-builder-/u);
                original.classList.add('ft-showcase-page-bridge-highlight');
                expect(sandbox.ledger().timers).toBe(1);
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-reset').click());
                expect(original.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-token');
                expect(original.classList.contains('host-class')).toBe(true);
                expect(original.classList.contains('ft-showcase-page-bridge-highlight')).toBe(true);
                expect(byRole(target, 'page-bridge-observed-events').querySelector('dd')?.textContent).toBe('0');
                expect(byRole(target, 'page-bridge-last-event').querySelector('dd')?.textContent).toBe('—');
                expect(byRole(target, 'page-bridge-status').textContent).toBe('Target found.');
                expect(sandbox.ledger()).toEqual(activeLedger);

                const focus = vi.spyOn(original, 'focus').mockImplementationOnce(() => { throw new Error('focus failed'); });
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                expect(byRole(target, 'page-bridge-status').textContent).toBe('Page bridge action could not complete.');
                focus.mockRestore();

                const dispatch = vi.spyOn(original, 'dispatchEvent').mockImplementationOnce(() => { throw new Error('dispatch failed'); });
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-demo').click());
                expect(byRole(target, 'page-bridge-status').textContent).toBe('Page bridge action could not complete.');
                dispatch.mockRestore();

                const setTimer = vi.spyOn(sandbox.environment, 'setTimer').mockImplementationOnce(() => { throw new Error('timer failed'); });
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                expect(byRole(target, 'page-bridge-status').textContent).toBe('Page bridge action could not complete.');
                expect(original.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-token');
                setTimer.mockRestore();

                const replacement = sandbox.replaceSearchInput('replacement secret');
                replacement.setAttribute('data-ft-showcase-page-bridge-highlight', 'replacement-host-token');
                sandbox.fireMutation();
                await harness.flush();
                expect(byRole(target, 'page-bridge-current-input').textContent).toBe('replacement secret');
                expect(original.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-token');
                expect(original.classList.contains('ft-showcase-page-bridge-highlight')).toBe(true);
                expect(sandbox.root.querySelectorAll('input#kw')).toHaveLength(1);
                expect(query.mock.calls.every(([selector]) => selector === 'input#kw' || selector === '#kw')).toBe(true);
                privacy.assertUnchanged();
            } finally {
                await harness.unmount();
                sandbox.dispose();
                outside.remove();
                privacy.restore();
            }
        });

        it.each(['tab', 'close', 'root-unmount'] as const)('cleans resources in order on %s and rejects retained callbacks', async teardown => {
            const harness = factory();
            const sandbox = createPageBridgeSandbox();
            const input = sandbox.addSearchInput('teardown private');
            input.setAttribute('data-ft-showcase-page-bridge-highlight', 'host-token');
            const outside = createOutsideSentinel();
            const privacy = capturePrivacyBoundary(outside, ['teardown private']);

            try {
                await harness.mount({ pageBridgeEnvironment: sandbox.environment });
                const target = await openPageBridge(harness);
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                const status = byRole<HTMLElement>(target, 'page-bridge-status');
                const statusSnapshot = status.textContent ?? '';
                sandbox.clearOperations();

                if (teardown === 'tab') {
                    await perform(harness, () => byRole<HTMLButtonElement>(target, 'tab-task').click());
                } else if (teardown === 'close') {
                    await perform(harness, () => target.querySelector<HTMLButtonElement>('[aria-label="Close component lab"]')?.click());
                } else {
                    await harness.unmount();
                }

                expect(sandbox.operations()).toEqual(orderedCleanup);
                expect(input.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-token');
                expect(sandbox.ledger()).toEqual(cleanLedger);
                await assertLateCallbacksAreRejected(harness, status, statusSnapshot, input, sandbox);
                privacy.assertUnchanged();
            } finally {
                await harness.unmount();
                sandbox.dispose();
                outside.remove();
                privacy.restore();
            }
        });

        it('latches fatal action failures after ordered cleanup with unavailable precedence', async () => {
            const harness = factory();
            const sandbox = createPageBridgeSandbox();
            const input = sandbox.addSearchInput('fatal private');
            input.setAttribute('data-ft-showcase-page-bridge-highlight', 'host-token');
            const outside = createOutsideSentinel();
            const privacy = capturePrivacyBoundary(outside, ['fatal private', 'query failed']);

            try {
                await harness.mount({ pageBridgeEnvironment: sandbox.environment });
                const target = await openPageBridge(harness);
                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                const status = byRole<HTMLElement>(target, 'page-bridge-status');
                sandbox.clearOperations();
                vi.spyOn(sandbox.root, 'querySelector').mockImplementation(() => { throw new Error('query failed'); });

                await perform(harness, () => byRole<HTMLButtonElement>(target, 'page-bridge-focus').click());
                expect(sandbox.operations()).toEqual(orderedCleanup);
                expect(sandbox.ledger()).toEqual(cleanLedger);
                expect(status.textContent).toBe('');
                expect(byRole(target, 'page-bridge-error-slot').textContent).toBe('Page bridge is unavailable.');
                expect(Array.from(byRole(target, 'page-bridge-actions').querySelectorAll('button'), button => button.disabled)).toEqual([true, true, true, true]);
                expect(input.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-token');
                await assertLateCallbacksAreRejected(harness, status, '', input, sandbox);
                privacy.assertUnchanged();
            } finally {
                await harness.unmount();
                sandbox.dispose();
                outside.remove();
                privacy.restore();
            }
        });
    });
}
