// @vitest-environment jsdom

import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
    BenchmarkTimeoutError,
    type BenchmarkMetrics,
    type BenchmarkRow,
    type RenderLabDependencies,
} from '../../src/common/components/benchmark';
import { createLitHarness } from './harness/lit';
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

const successfulMetrics: BenchmarkMetrics = { createMs: 1.25, updateMs: 2, removeMs: 3.04, remainingRows: 1 };
const finalRows: readonly BenchmarkRow[] = [{ id: 10, label: 'Row 0010', revision: 1 }];

function getByRole<T extends Element>(root: ParentNode, role: string): T {
    const element = root.querySelector<T>(`[data-ft-role="${role}"]`);
    if (element === null) throw new Error(`Missing data-ft-role=${role}`);
    return element;
}

function directRoles(element: Element): (string | null)[] {
    return Array.from(element.children, child => child.getAttribute('data-ft-role'));
}

async function perform(harness: ComponentLabHarness, action: () => void): Promise<void> {
    if (harness.framework === 'react') act(action);
    else action();
    await harness.flush();
}

async function click(harness: ComponentLabHarness, element: HTMLElement): Promise<void> {
    await perform(harness, () => element.click());
}

async function setValue(harness: ComponentLabHarness, element: HTMLInputElement | HTMLSelectElement, value: string): Promise<void> {
    await perform(harness, () => {
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
        if (descriptor?.set === undefined) throw new Error('Control has no native value setter.');
        descriptor.set.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

async function submit(harness: ComponentLabHarness, form: HTMLFormElement): Promise<void> {
    await perform(harness, () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

async function openLab(harness: ComponentLabHarness): Promise<HTMLElement> {
    const target = harness.getTarget();
    await click(harness, getByRole<HTMLButtonElement>(target, 'launcher'));
    return target;
}

async function openRender(harness: ComponentLabHarness): Promise<HTMLElement> {
    const target = await openLab(harness);
    await click(harness, getByRole<HTMLButtonElement>(target, 'tab-render'));
    return target;
}

function dependencies(runScenario: RenderLabDependencies['runScenario']): RenderLabDependencies {
    return {
        scheduler: {
            now: () => 0,
            requestFrame: () => 1,
            cancelFrame: () => undefined,
            setTimer: (callback, milliseconds) => setTimeout(callback, milliseconds),
            clearTimer: handle => clearTimeout(handle),
        },
        runScenario,
    };
}

async function withHarness(factory: ComponentLabHarnessFactory, test: (harness: ComponentLabHarness) => Promise<void>): Promise<void> {
    const harness = factory();
    try {
        await test(harness);
    } finally {
        await harness.unmount();
    }
}

for (const factory of harnessFactories) {
    const framework = factory().framework;

    describe(`${framework} Component Lab contract`, () => {
        it('renders the exact shell, Task skeleton, copy, IDs, and ARIA relationships', async () => {
            await withHarness(factory, async harness => {
                await harness.mount({ nickname: `${framework}-sample` });
                const target = await openLab(harness);
                const launcher = getByRole<HTMLButtonElement>(target, 'launcher');
                const dialog = getByRole<HTMLDialogElement>(target, 'dialog');
                const panel = dialog.querySelector<HTMLElement>('[role="tabpanel"]');
                const workbench = getByRole<HTMLElement>(dialog, 'task-workbench');
                if (panel === null) throw new Error('Missing Task panel.');

                expect(launcher.textContent?.trim()).toBe('Open');
                expect(launcher.getAttribute('aria-label')).toMatch(/^Open .+ component lab$/);
                expect(launcher.getAttribute('aria-haspopup')).toBe('dialog');
                expect(launcher.getAttribute('aria-expanded')).toBe('true');
                expect(dialog.open).toBe(true);
                expect(Array.from(dialog.children, child => child.getAttribute('data-ft-role') ?? child.getAttribute('role'))).toEqual([
                    null,
                    'tablist',
                    'tabpanel',
                ]);
                expect(directRoles(workbench)).toEqual([
                    'task-description',
                    'task-form',
                    'task-filters',
                    'task-summary',
                    'task-progress',
                    'task-list',
                    'task-actions',
                ]);
                expect(directRoles(getByRole(workbench, 'task-form'))).toEqual(['task-title-field', 'task-priority-field', 'task-add']);
                expect(directRoles(getByRole(workbench, 'task-filters'))).toEqual(['task-search-field', 'task-filter']);
                expect(directRoles(getByRole(workbench, 'task-actions'))).toEqual(['task-clear', 'task-reset']);
                expect(getByRole<HTMLFormElement>(workbench, 'task-form').noValidate).toBe(true);
                expect(getByRole(workbench, 'task-description').textContent).toBe('Add, filter, and update a deterministic task list.');
                expect(getByRole(workbench, 'task-summary').textContent).toBe('2 open · 1 done · 3 total');
                const progress = getByRole<HTMLProgressElement>(workbench, 'task-progress');
                expect([progress.max, progress.value, progress.getAttribute('aria-valuetext')]).toEqual([3, 1, '1 of 3 tasks complete']);
                expect(getByRole(workbench, 'task-list').children).toHaveLength(3);
                expect(getByRole<HTMLButtonElement>(workbench, 'task-add').type).toBe('submit');
                expect(getByRole<HTMLButtonElement>(workbench, 'task-clear').type).toBe('button');
                expect(getByRole<HTMLButtonElement>(workbench, 'task-reset').type).toBe('button');

                const nickname = `${framework}-sample`;
                expect(panel.id).toBe(`ft-${nickname}-panel-task`);
                expect(panel.getAttribute('aria-labelledby')).toBe(`ft-${nickname}-tab-task`);
                expect(panel.getAttribute('aria-describedby')).toBe(`ft-${nickname}-task-description`);
                const radios = Array.from(workbench.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
                expect(radios.map(radio => radio.name)).toEqual(Array(3).fill(`ft-${nickname}-task-status`));
                const ids = Array.from(document.querySelectorAll<HTMLElement>('[id]'), element => element.id);
                expect(new Set(ids).size).toBe(ids.length);
                for (const attribute of ['aria-labelledby', 'aria-describedby']) {
                    for (const element of target.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
                        for (const id of (element.getAttribute(attribute) ?? '').split(/\s+/u)) expect(document.getElementById(id)).not.toBeNull();
                    }
                }
                expect(document.getElementById(getByRole(target, 'tab-task').getAttribute('aria-controls') ?? '')).toBe(panel);
                expect(document.activeElement).toBe(getByRole(target, 'tab-task'));
            });
        });

        it('normalizes and validates Task input, then searches case-insensitively', async () => {
            await withHarness(factory, async harness => {
                await harness.mount();
                const target = await openLab(harness);
                const form = getByRole<HTMLFormElement>(target, 'task-form');
                const title = getByRole<HTMLInputElement>(target, 'task-title');
                const priority = getByRole<HTMLSelectElement>(target, 'task-priority');

                await submit(harness, form);
                expect(target.querySelector('[role="alert"]')?.textContent).toBe('Enter a task title.');
                expect(title.getAttribute('aria-invalid')).toBe('true');
                expect(document.activeElement).toBe(title);

                await setValue(harness, title, ' '.repeat(61));
                await submit(harness, form);
                expect(target.querySelector('[role="alert"]')?.textContent).toBe('Enter a task title.');
                await setValue(harness, title, 'x'.repeat(61));
                await submit(harness, form);
                expect(target.querySelector('[role="alert"]')?.textContent).toBe('Use 60 characters or fewer.');

                await setValue(harness, title, 'Valid title');
                await setValue(harness, priority, 'invalid');
                await submit(harness, form);
                expect(target.querySelector('[role="alert"]')?.textContent).toBe('Choose a valid priority.');
                expect(priority.getAttribute('aria-errormessage')).toBe(`ft-${framework}-task-error`);
                await setValue(harness, title, '  Added   item  ');
                expect(target.querySelector('[role="alert"]')).toBeNull();
                expect(title.hasAttribute('aria-invalid')).toBe(false);
                await setValue(harness, priority, 'high');
                await submit(harness, form);
                expect(Array.from(target.querySelectorAll('.ft-showcase-task-title'), element => element.textContent)).toContain('Added item');
                expect(document.activeElement).toBe(title);

                await setValue(harness, getByRole<HTMLInputElement>(target, 'task-search'), '  review  ');
                expect(Array.from(target.querySelectorAll('.ft-showcase-task-title'), element => element.textContent)).toEqual(['Review build output']);
            });
        });

        it('applies filters, CRUD focus rules, reset, and panel-local versus collection persistence', async () => {
            await withHarness(factory, async harness => {
                await harness.mount();
                const target = await openLab(harness);
                const title = getByRole<HTMLInputElement>(target, 'task-title');
                await setValue(harness, title, 'Persisted task');
                await submit(harness, getByRole(target, 'task-form'));
                expect(getByRole(target, 'task-summary').textContent).toBe('3 open · 1 done · 4 total');

                const doneRadio = target.querySelector<HTMLInputElement>('input[type="radio"][value="done"]');
                if (doneRadio === null) throw new Error('Missing Done filter.');
                await perform(harness, () => {
                    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
                    if (descriptor?.set === undefined) throw new Error('Radio has no native checked setter.');
                    descriptor.set.call(doneRadio, true);
                    doneRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    doneRadio.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                });
                expect(target.querySelectorAll('[data-ft-role="task-row"]')).toHaveLength(1);
                expect(getByRole<HTMLButtonElement>(target, 'task-clear').disabled).toBe(false);
                await setValue(harness, getByRole<HTMLInputElement>(target, 'task-search'), 'no match');
                expect(getByRole(target, 'task-empty').textContent).toBe('No tasks match this view.');
                expect(getByRole<HTMLButtonElement>(target, 'task-clear').disabled).toBe(false);
                await click(harness, getByRole(target, 'task-clear'));
                expect(getByRole(target, 'task-summary').textContent).toBe('3 open · 0 done · 3 total');
                expect(getByRole<HTMLButtonElement>(target, 'task-clear').disabled).toBe(true);
                expect(document.activeElement).toBe(title);

                await click(harness, getByRole(target, 'task-reset'));
                expect(getByRole(target, 'task-summary').textContent).toBe('2 open · 1 done · 3 total');
                expect(getByRole<HTMLButtonElement>(target, 'task-reset').disabled).toBe(true);

                await setValue(harness, title, 'Keep across tabs');
                await submit(harness, getByRole(target, 'task-form'));
                await setValue(harness, title, 'local draft');
                await click(harness, getByRole(target, 'tab-render'));
                await click(harness, getByRole(target, 'tab-task'));
                expect(getByRole<HTMLInputElement>(target, 'task-title').value).toBe('');
                expect(Array.from(target.querySelectorAll('.ft-showcase-task-title'), element => element.textContent)).toContain('Keep across tabs');

                const dialog = getByRole<HTMLDialogElement>(target, 'dialog');
                await click(harness, target.querySelector<HTMLButtonElement>('[aria-label="Close component lab"]')!);
                expect(dialog.open).toBe(false);
                expect(document.activeElement).toBe(getByRole(target, 'launcher'));
                await openLab(harness);
                expect(Array.from(target.querySelectorAll('.ft-showcase-task-title'), element => element.textContent)).toContain('Keep across tabs');
            });
        });

        it('isolates native modal focus/clicks and restores the opener after cancel and backdrop close', async () => {
            await withHarness(factory, async harness => {
                const hostButton = document.createElement('button');
                let hostClicks = 0;
                hostButton.addEventListener('click', () => { hostClicks += 1; });
                document.body.appendChild(hostButton);
                try {
                    await harness.mount();
                    const target = await openLab(harness);
                    const dialog = getByRole<HTMLDialogElement>(target, 'dialog');
                    hostButton.focus();
                    expect(document.activeElement).not.toBe(hostButton);
                    hostButton.click();
                    expect(hostClicks).toBe(0);

                    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button,input,select')).filter(element => element.tabIndex >= 0 && !('disabled' in element && (element as HTMLButtonElement).disabled));
                    const last = focusable.at(-1)!;
                    last.focus();
                    await perform(harness, () => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
                    expect(document.activeElement).not.toBe(last);

                    await perform(harness, () => dialog.dispatchEvent(new Event('cancel', { cancelable: true })));
                    expect(dialog.open).toBe(false);
                    expect(document.activeElement).toBe(getByRole(target, 'launcher'));
                    hostButton.focus();
                    expect(document.activeElement).toBe(hostButton);

                    await openLab(harness);
                    const reopenedDialog = getByRole<HTMLDialogElement>(target, 'dialog');
                    await perform(harness, () => reopenedDialog.dispatchEvent(new MouseEvent('click', { bubbles: true })));
                    expect(reopenedDialog.open).toBe(false);
                    hostButton.click();
                    expect(hostClicks).toBe(1);
                } finally {
                    hostButton.remove();
                }
            });
        });

        it('covers Render idle, invalid input, success, reset, hidden, timeout, and error states', async () => {
            await withHarness(factory, async harness => {
                let scenario: 'success' | 'timeout' | 'error' = 'success';
                const successRunner = vi.fn<RenderLabDependencies['runScenario']>(options => {
                    if (scenario === 'timeout') return Promise.reject(new BenchmarkTimeoutError('settle'));
                    if (scenario === 'error') return Promise.reject(new Error('runner failed'));
                    options.adapter.replaceRows([{ id: 1, label: 'Row 0001', revision: 0 }]);
                    options.adapter.updateRows([{ id: 1, label: 'Row 0001', revision: 1 }]);
                    options.adapter.removeRows(finalRows);
                    return Promise.resolve(successfulMetrics);
                });
                await harness.mount({ dependencies: dependencies(successRunner) });
                const target = await openRender(harness);
                const size = getByRole<HTMLSelectElement>(target, 'render-size');
                const run = getByRole<HTMLButtonElement>(target, 'render-run');
                let secondary = getByRole<HTMLButtonElement>(target, 'render-secondary');
                const status = getByRole(target, 'render-status');
                expect([size.value, size.disabled, run.disabled, secondary.textContent, secondary.disabled, status.textContent]).toEqual([
                    '1000', false, false, 'Reset', true, '',
                ]);
                expect([status.getAttribute('role'), status.getAttribute('aria-live'), status.getAttribute('aria-atomic')]).toEqual(['status', 'polite', 'true']);
                expect(directRoles(getByRole(target, 'render-lab'))).toEqual(['render-description', 'render-disclaimer', 'render-controls', 'render-status', 'render-metrics', 'render-table']);
                expect(directRoles(getByRole(target, 'render-controls'))).toEqual(['render-size-field', 'render-run', 'render-secondary', 'render-error-slot']);
                expect(directRoles(getByRole(target, 'render-metrics'))).toEqual(['metric-create', 'metric-update', 'metric-remove', 'metric-remaining']);

                await setValue(harness, size, '999');
                expect(target.querySelector('[role="alert"]')?.textContent).toBe('Choose a valid row count.');
                expect(size.getAttribute('aria-invalid')).toBe('true');
                expect(successRunner).not.toHaveBeenCalled();
                await setValue(harness, size, '250');
                expect(target.querySelector('[role="alert"]')).toBeNull();
                await click(harness, run);
                expect(status.textContent).toBe('Scenario complete.');
                expect(Array.from(target.querySelectorAll('[data-ft-role="render-row"] td'), cell => cell.textContent)).toEqual(['10', 'Row 0010', '1 · Updated']);
                expect(Array.from(target.querySelectorAll('[data-ft-role^="metric-"] dd'), cell => cell.textContent)).toEqual(['1.3 ms', '2.0 ms', '3.0 ms', '1']);
                secondary = getByRole(target, 'render-secondary');
                expect([secondary.textContent, secondary.disabled]).toEqual(['Reset', false]);
                await click(harness, secondary);
                expect([getByRole<HTMLSelectElement>(target, 'render-size').value, status.textContent, target.querySelectorAll('[data-ft-role="render-row"]').length]).toEqual(['1000', '', 0]);

                const originalHidden = Object.getOwnPropertyDescriptor(document, 'hidden');
                Object.defineProperty(document, 'hidden', { configurable: true, value: true });
                await click(harness, run);
                expect(status.textContent).toBe('Keep this page visible, then try again.');
                if (originalHidden === undefined) delete (document as Document & { hidden?: boolean }).hidden;
                else Object.defineProperty(document, 'hidden', originalHidden);

                const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
                scenario = 'timeout';
                await click(harness, run);
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario timed out. Try again or reset.');
                expect(warn).toHaveBeenCalledOnce();
                warn.mockRestore();

                const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
                scenario = 'error';
                await click(harness, run);
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario could not complete.');
                expect(error).toHaveBeenCalledOnce();
                error.mockRestore();
            });
        });

        it('cancels active runs, rejects stale adapter writes, and aborts before unmount removes DOM', async () => {
            await withHarness(factory, async harness => {
                let resolveRun: ((metrics: BenchmarkMetrics) => void) | undefined;
                let captured: Parameters<RenderLabDependencies['runScenario']>[0] | undefined;
                const deferredRunner: RenderLabDependencies['runScenario'] = options => {
                    captured = options;
                    return new Promise(resolve => { resolveRun = resolve; });
                };
                await harness.mount({ dependencies: dependencies(deferredRunner) });
                const target = await openRender(harness);
                await click(harness, getByRole(target, 'render-run'));
                expect(getByRole(target, 'render-status').textContent).toBe('Running…');
                expect(getByRole<HTMLSelectElement>(target, 'render-size').disabled).toBe(true);
                expect(getByRole<HTMLButtonElement>(target, 'render-run').disabled).toBe(true);
                expect(getByRole(target, 'render-secondary').textContent).toBe('Cancel');
                await click(harness, getByRole(target, 'render-secondary'));
                expect(captured?.signal.aborted).toBe(true);
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario canceled.');
                captured?.adapter.replaceRows(finalRows);
                resolveRun?.(successfulMetrics);
                await harness.flush();
                expect(target.querySelectorAll('[data-ft-role="render-row"]')).toHaveLength(0);
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario canceled.');

                await click(harness, getByRole(target, 'render-run'));
                const unmountSignal = captured?.signal;
                const mountedTarget = harness.getTarget();
                await harness.unmount();
                expect(unmountSignal?.aborted).toBe(true);
                expect(mountedTarget.isConnected).toBe(false);
                expect(mountedTarget.childElementCount).toBe(0);
                await harness.unmount();
            });
        });

        it('keeps separately mounted roots isolated and resetState restores strict initial state', async () => {
            const first = factory();
            const second = factory();
            try {
                await first.mount({ nickname: `${framework}-first` });
                await second.mount({ nickname: `${framework}-second` });
                const firstTarget = await openLab(first);
                await setValue(first, getByRole(firstTarget, 'task-title'), 'First root only');
                await submit(first, getByRole(firstTarget, 'task-form'));
                await click(first, firstTarget.querySelector<HTMLButtonElement>('[aria-label="Close component lab"]')!);

                const secondTarget = await openLab(second);
                expect(getByRole(secondTarget, 'task-summary').textContent).toBe('2 open · 1 done · 3 total');
                expect(secondTarget.textContent).not.toContain('First root only');
                await click(second, secondTarget.querySelector<HTMLButtonElement>('[aria-label="Close component lab"]')!);

                await first.resetState();
                const resetTarget = await openLab(first);
                expect(getByRole(resetTarget, 'task-summary').textContent).toBe('2 open · 1 done · 3 total');
                expect(resetTarget.textContent).not.toContain('First root only');
            } finally {
                await first.unmount();
                await second.unmount();
            }
        });
    });
}
