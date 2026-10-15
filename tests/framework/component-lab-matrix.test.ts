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

const successfulMetrics: BenchmarkMetrics = { createMs: 1.25, updateMs: 2, removeMs: 3.04, remainingRows: 2 };
const finalRows: readonly BenchmarkRow[] = [
    { id: 1, label: 'Row 0001', revision: 0 },
    { id: 10, label: 'Row 0010', revision: 1 },
];

function getByRole<T extends Element>(root: ParentNode, role: string): T {
    const element = root.querySelector<T>(`[data-ft-role="${role}"]`);
    if (element === null) throw new Error(`Missing data-ft-role=${role}`);
    return element;
}

function directSignature(element: Element): string[] {
    return Array.from(element.children, child => `${child.tagName.toLowerCase()}:${child.getAttribute('data-ft-role') ?? ''}`);
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

async function submit(harness: ComponentLabHarness, root: ParentNode): Promise<void> {
    const form = getByRole<HTMLFormElement>(root, 'task-form');
    await perform(harness, () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}

async function chooseFilter(harness: ComponentLabHarness, root: ParentNode, value: 'all' | 'open' | 'done'): Promise<void> {
    const radio = root.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`);
    if (radio === null) throw new Error(`Missing ${value} filter.`);
    await click(harness, radio);
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

function expectRenderControls(root: ParentNode, expected: {
    readonly sizeDisabled: boolean;
    readonly runDisabled: boolean;
    readonly secondaryText: 'Reset' | 'Cancel';
    readonly secondaryDisabled: boolean;
    readonly status: string;
}): void {
    expect([
        getByRole<HTMLSelectElement>(root, 'render-size').disabled,
        getByRole<HTMLButtonElement>(root, 'render-run').disabled,
        getByRole<HTMLButtonElement>(root, 'render-secondary').textContent,
        getByRole<HTMLButtonElement>(root, 'render-secondary').disabled,
        getByRole(root, 'render-status').textContent,
    ]).toEqual([
        expected.sizeDisabled,
        expected.runDisabled,
        expected.secondaryText,
        expected.secondaryDisabled,
        expected.status,
    ]);
}

async function resetRender(harness: ComponentLabHarness, root: ParentNode): Promise<void> {
    await click(harness, getByRole(root, 'render-secondary'));
    expect(getByRole<HTMLSelectElement>(root, 'render-size').value).toBe('1000');
    expect(root.querySelectorAll('[data-ft-role="render-row"]')).toHaveLength(0);
    expect(Array.from(root.querySelectorAll('[data-ft-role^="metric-"] dd'), element => element.textContent)).toEqual(['—', '—', '—', '—']);
    expectRenderControls(root, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: true, status: '' });
}

for (const factory of harnessFactories) {
    const framework = factory().framework;

    describe(`${framework} complete Component Lab matrix`, () => {
        it('renders deep Task and Render structures with fixed native copy and ordering', async () => {
            await withHarness(factory, async harness => {
                await harness.mount({ dependencies: dependencies(options => {
                    options.adapter.replaceRows(finalRows);
                    options.adapter.updateRows(finalRows);
                    options.adapter.removeRows(finalRows);
                    return Promise.resolve(successfulMetrics);
                }) });
                const target = await openLab(harness);
                const titleField = getByRole(target, 'task-title-field');
                const priorityField = getByRole(target, 'task-priority-field');
                const fieldset = getByRole(target, 'task-filter');
                const list = getByRole(target, 'task-list');
                const firstRow = getByRole(list, 'task-row');

                expect(directSignature(titleField)).toEqual(['label:', 'input:task-title', 'div:task-title-error-slot']);
                expect(directSignature(priorityField)).toEqual(['label:', 'select:task-priority', 'div:task-priority-error-slot']);
                expect(directSignature(fieldset)).toEqual(['legend:', 'label:', 'label:', 'label:']);
                expect(fieldset.firstElementChild?.textContent).toBe('Task status');
                expect(Array.from(getByRole<HTMLSelectElement>(target, 'task-priority').options, option => [option.text, option.value])).toEqual([
                    ['Low', 'low'], ['Medium', 'medium'], ['High', 'high'],
                ]);
                expect(Array.from(fieldset.querySelectorAll('label'), label => [
                    label.textContent?.trim(),
                    label.querySelector<HTMLInputElement>('input')?.value,
                ])).toEqual([
                    ['All', 'all'], ['Open', 'open'], ['Done', 'done'],
                ]);
                expect(Array.from(list.children).every(child => child.tagName === 'LI')).toBe(true);
                expect(directSignature(firstRow)).toEqual(['input:task-toggle', 'span:', 'span:', 'button:task-delete']);
                expect(firstRow.querySelector('[data-ft-role="task-toggle"]')?.nextElementSibling?.textContent).toBe('Review build output');
                expect(firstRow.lastElementChild?.textContent?.trim()).toBe('Delete');

                const title = getByRole<HTMLInputElement>(target, 'task-title');
                await submit(harness, target);
                const titleSlot = getByRole(target, 'task-title-error-slot');
                expect(title.nextElementSibling).toBe(titleSlot);
                expect(titleSlot.firstElementChild?.getAttribute('role')).toBe('alert');
                expect(title.getAttribute('aria-errormessage')).toBe(titleSlot.firstElementChild?.id);
                expect(getByRole(target, 'task-priority-error-slot').childElementCount).toBe(0);

                await click(harness, getByRole(target, 'tab-render'));
                const renderLab = getByRole(target, 'render-lab');
                const sizeField = getByRole(target, 'render-size-field');
                const metrics = getByRole(target, 'render-metrics');
                const table = getByRole<HTMLTableElement>(target, 'render-table');
                expect(directSignature(renderLab)).toEqual([
                    'p:render-description', 'p:render-disclaimer', 'div:render-controls', 'div:render-status', 'dl:render-metrics', 'table:render-table',
                ]);
                expect(directSignature(sizeField)).toEqual(['label:', 'select:render-size']);
                expect(Array.from(getByRole<HTMLSelectElement>(target, 'render-size').options, option => [option.text, option.value])).toEqual([
                    ['250', '250'], ['1000', '1000'], ['2000', '2000'],
                ]);
                expect(Array.from(metrics.children, metric => directSignature(metric))).toEqual([
                    ['dt:', 'dd:'], ['dt:', 'dd:'], ['dt:', 'dd:'], ['dt:', 'dd:'],
                ]);
                expect(Array.from(metrics.querySelectorAll('dt'), element => element.textContent)).toEqual([
                    'Create', 'Update every 10th', 'Remove every 7th', 'Remaining rows',
                ]);
                expect(directSignature(table)).toEqual(['thead:', 'tbody:']);
                const headRow = table.tHead?.rows[0];
                if (headRow === undefined) throw new Error('Missing Render table header row.');
                expect(directSignature(headRow)).toEqual(['th:', 'th:', 'th:']);
                expect(Array.from(table.tHead?.querySelectorAll('th') ?? [], cell => cell.textContent)).toEqual(['ID', 'Label', 'Revision']);
                expect(table.tBodies).toHaveLength(1);
                expect(table.tBodies[0].rows).toHaveLength(0);

                await click(harness, getByRole(target, 'render-run'));
                expect(Array.from(table.tBodies[0].rows, row => Array.from(row.cells, cell => cell.textContent))).toEqual([
                    ['1', 'Row 0001', '0'], ['10', 'Row 0010', '1 · Updated'],
                ]);
            });
        });

        it('covers normalization, search truncation, error clearing, and structural Reset rules', async () => {
            await withHarness(factory, async harness => {
                await harness.mount();
                const target = await openLab(harness);
                const title = getByRole<HTMLInputElement>(target, 'task-title');
                const priority = getByRole<HTMLSelectElement>(target, 'task-priority');
                const search = getByRole<HTMLInputElement>(target, 'task-search');
                const reset = getByRole<HTMLButtonElement>(target, 'task-reset');
                expect(reset.disabled).toBe(true);

                const rawLongTitle = 'a  '.repeat(21);
                expect([...rawLongTitle].length).toBeGreaterThan(60);
                await setValue(harness, title, rawLongTitle);
                await submit(harness, target);
                expect(Array.from(target.querySelectorAll('.ft-showcase-task-title'), element => element.textContent)).toContain('a '.repeat(20) + 'a');

                await setValue(harness, search, `review${' '.repeat(54)}discarded`);
                expect(search.value).toBe('review');
                expect(Array.from(target.querySelectorAll('.ft-showcase-task-title'), element => element.textContent)).toEqual(['Review build output']);
                await setValue(harness, search, 'BUILD');
                expect(Array.from(target.querySelectorAll('.ft-showcase-task-title'), element => element.textContent)).toEqual(['Review build output']);
                await setValue(harness, search, '');

                await setValue(harness, title, 'Valid title');
                await setValue(harness, priority, 'invalid');
                await submit(harness, target);
                const prioritySlot = getByRole(target, 'task-priority-error-slot');
                expect(prioritySlot.firstElementChild?.textContent).toBe('Choose a valid priority.');
                expect(priority.getAttribute('aria-invalid')).toBe('true');
                expect(priority.getAttribute('aria-errormessage')).toBe(prioritySlot.firstElementChild?.id);
                await setValue(harness, title, 'Changed title');
                expect(prioritySlot.childElementCount).toBe(0);
                expect(priority.hasAttribute('aria-invalid')).toBe(false);
                expect(priority.hasAttribute('aria-errormessage')).toBe(false);
                await submit(harness, target);
                expect(prioritySlot.firstElementChild?.textContent).toBe('Choose a valid priority.');
                await setValue(harness, priority, 'medium');
                expect(prioritySlot.childElementCount).toBe(0);
                expect(priority.hasAttribute('aria-invalid')).toBe(false);
                expect(priority.hasAttribute('aria-errormessage')).toBe(false);

                await click(harness, reset);
                expect(reset.disabled).toBe(true);
                const firstToggle = target.querySelector<HTMLInputElement>('[data-ft-role="task-toggle"][data-task-id="1"]')!;
                await click(harness, firstToggle);
                await click(harness, target.querySelector<HTMLInputElement>('[data-ft-role="task-toggle"][data-task-id="1"]')!);
                expect(reset.disabled).toBe(true);

                await setValue(harness, title, 'draft');
                expect(reset.disabled).toBe(false);
                await setValue(harness, title, '');
                await setValue(harness, priority, 'low');
                await setValue(harness, priority, 'medium');
                await setValue(harness, search, 'review');
                await setValue(harness, search, '');
                await chooseFilter(harness, target, 'done');
                await chooseFilter(harness, target, 'all');
                expect(reset.disabled).toBe(true);

                await setValue(harness, title, 'Temporary task');
                await submit(harness, target);
                const addedDelete = target.querySelector<HTMLButtonElement>('[data-ft-role="task-delete"][data-task-id="4"]')!;
                await click(harness, addedDelete);
                expect(getByRole(target, 'task-summary').textContent).toBe('2 open · 1 done · 3 total');
                expect(reset.disabled).toBe(false);
                await click(harness, reset);
                expect(reset.disabled).toBe(true);
            });
        });

        it('follows Done-to-Open, search-plus-filter, filtered-delete, and fallback focus paths', async () => {
            await withHarness(factory, async harness => {
                await harness.mount();
                const target = await openLab(harness);

                await chooseFilter(harness, target, 'done');
                const doneToggle = target.querySelector<HTMLInputElement>('[data-ft-role="task-toggle"][data-task-id="2"]')!;
                doneToggle.focus();
                await click(harness, doneToggle);
                expect(getByRole(target, 'task-empty').textContent).toBe('No tasks match this view.');
                expect(document.activeElement).toBe(getByRole(target, 'task-add'));

                await click(harness, getByRole(target, 'task-reset'));
                await chooseFilter(harness, target, 'open');
                await setValue(harness, getByRole(target, 'task-search'), 'build');
                const searchedToggle = target.querySelector<HTMLInputElement>('[data-ft-role="task-toggle"][data-task-id="1"]')!;
                searchedToggle.focus();
                await click(harness, searchedToggle);
                expect(getByRole(target, 'task-empty').textContent).toBe('No tasks match this view.');
                expect(document.activeElement).toBe(getByRole(target, 'task-add'));

                await click(harness, getByRole(target, 'task-reset'));
                await chooseFilter(harness, target, 'open');
                const filteredDelete = target.querySelector<HTMLButtonElement>('[data-ft-role="task-delete"][data-task-id="1"]')!;
                filteredDelete.focus();
                await click(harness, filteredDelete);
                expect(document.activeElement).toBe(target.querySelector('[data-ft-role="task-delete"][data-task-id="3"]'));
            });
        });

        it('covers the complete Render control, preservation, error, and Reset matrix', async () => {
            await withHarness(factory, async harness => {
                let scenario: 'success' | 'deferred' | 'timeout' | 'error' | 'nonfinite' = 'success';
                let deferredResolve: ((metrics: BenchmarkMetrics) => void) | undefined;
                const runner = vi.fn<RenderLabDependencies['runScenario']>(options => {
                    if (scenario === 'deferred') return new Promise(resolve => { deferredResolve = resolve; });
                    if (scenario === 'timeout') return Promise.reject(new BenchmarkTimeoutError('settle'));
                    if (scenario === 'error') return Promise.reject(new Error('runner failed'));
                    options.adapter.replaceRows(finalRows);
                    options.adapter.updateRows(finalRows);
                    options.adapter.removeRows(finalRows);
                    return Promise.resolve(scenario === 'nonfinite' ? { ...successfulMetrics, createMs: Number.NaN } : successfulMetrics);
                });
                await harness.mount({ dependencies: dependencies(runner) });
                const target = await openRender(harness);
                const size = getByRole<HTMLSelectElement>(target, 'render-size');
                const run = getByRole<HTMLButtonElement>(target, 'render-run');
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: true, status: '' });

                await setValue(harness, size, '999');
                expect(size.value).toBe('1000');
                expect(size.getAttribute('aria-invalid')).toBe('true');
                expect(size.getAttribute('aria-errormessage')).toBe(target.querySelector('[data-ft-role="render-error-slot"] [role="alert"]')?.id);
                expect(runner).not.toHaveBeenCalled();
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: false, status: '' });
                await resetRender(harness, target);

                await setValue(harness, size, '250');
                await click(harness, run);
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: false, status: 'Scenario complete.' });
                const successCells = Array.from(target.querySelectorAll('[data-ft-role="render-row"] td'), cell => cell.textContent);
                const successMetrics = Array.from(target.querySelectorAll('[data-ft-role^="metric-"] dd'), cell => cell.textContent);
                await setValue(harness, size, '999');
                expect(size.value).toBe('250');
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario complete.');
                expect(Array.from(target.querySelectorAll('[data-ft-role="render-row"] td'), cell => cell.textContent)).toEqual(successCells);
                expect(Array.from(target.querySelectorAll('[data-ft-role^="metric-"] dd'), cell => cell.textContent)).toEqual(successMetrics);
                await setValue(harness, size, '1000');
                expect(size.hasAttribute('aria-invalid')).toBe(false);
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario complete.');

                await setValue(harness, size, '999');
                await click(harness, run);
                expect(size.hasAttribute('aria-invalid')).toBe(false);
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario complete.');
                await setValue(harness, size, '999');
                await resetRender(harness, target);

                scenario = 'deferred';
                await click(harness, run);
                expectRenderControls(target, { sizeDisabled: true, runDisabled: true, secondaryText: 'Cancel', secondaryDisabled: false, status: 'Running…' });
                await click(harness, getByRole(target, 'render-secondary'));
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: false, status: 'Scenario canceled.' });
                deferredResolve?.(successfulMetrics);
                await harness.flush();
                expect(getByRole(target, 'render-status').textContent).toBe('Scenario canceled.');
                await resetRender(harness, target);

                const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
                Object.defineProperty(document, 'hidden', { configurable: true, value: true });
                await click(harness, run);
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: false, status: 'Keep this page visible, then try again.' });
                if (hiddenDescriptor === undefined) delete (document as Document & { hidden?: boolean }).hidden;
                else Object.defineProperty(document, 'hidden', hiddenDescriptor);
                await resetRender(harness, target);

                const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
                scenario = 'timeout';
                await click(harness, run);
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: false, status: 'Scenario timed out. Try again or reset.' });
                expect(warn).toHaveBeenCalledOnce();
                warn.mockRestore();
                await resetRender(harness, target);

                const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
                scenario = 'error';
                await click(harness, run);
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: false, status: 'Scenario could not complete.' });
                expect(error).toHaveBeenCalledOnce();
                await resetRender(harness, target);

                scenario = 'nonfinite';
                await click(harness, run);
                expectRenderControls(target, { sizeDisabled: false, runDisabled: false, secondaryText: 'Reset', secondaryDisabled: false, status: 'Scenario could not complete.' });
                expect(error).toHaveBeenCalledTimes(2);
                error.mockRestore();
                expect(target.querySelectorAll('[data-ft-role="render-row"]')).toHaveLength(0);
                expect(Array.from(target.querySelectorAll('[data-ft-role^="metric-"] dd'), cell => cell.textContent)).toEqual(['—', '—', '—', '—']);
                await resetRender(harness, target);
            });
        });

        it('makes document, visibility, dialog, and late runner callbacks inert after unmount', async () => {
            const hostButton = document.createElement('button');
            const hostClick = vi.fn();
            hostButton.addEventListener('click', hostClick);
            document.body.appendChild(hostButton);
            const harness = factory();
            let lateRun: {
                readonly options: Parameters<RenderLabDependencies['runScenario']>[0];
                readonly resolve: (metrics: BenchmarkMetrics) => void;
            } | undefined;
            try {
                await harness.mount({ dependencies: dependencies(options => new Promise(resolve => { lateRun = { options, resolve }; })) });
                const target = await openRender(harness);
                await click(harness, getByRole(target, 'render-run'));
                const dialog = getByRole<HTMLDialogElement>(target, 'dialog');
                const retainedStatus = getByRole(dialog, 'render-status');
                expect(retainedStatus.textContent).toBe('Running…');

                await harness.unmount();
                expect(lateRun?.options.signal.aborted).toBe(true);
                hostButton.focus();
                document.dispatchEvent(new Event('visibilitychange'));
                dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
                dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
                expect(document.activeElement).toBe(hostButton);
                hostButton.click();
                expect(hostClick).toHaveBeenCalledOnce();

                lateRun?.options.adapter.replaceRows(finalRows);
                lateRun?.options.adapter.updateRows(finalRows);
                lateRun?.options.adapter.removeRows(finalRows);
                lateRun?.resolve(successfulMetrics);
                await Promise.resolve();
                await Promise.resolve();
                expect(retainedStatus.textContent).toBe('Running…');
                expect(dialog.querySelectorAll('[data-ft-role="render-row"]')).toHaveLength(0);
            } finally {
                await harness.unmount();
                hostButton.remove();
            }
        });
    });
}
