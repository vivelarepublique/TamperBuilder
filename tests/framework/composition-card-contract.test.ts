// @vitest-environment jsdom

import { createElement as reactElement, act as reactAct } from 'react';
import { createRoot } from 'react-dom/client';
import { h as preactElement, render as renderPreact } from 'preact';
import { act as preactAct } from 'preact/test-utils';
import { createComponent } from 'solid-js';
import { render as renderSolid } from 'solid-js/web';
import { createApp, h as vueElement, nextTick } from 'vue';
import { html, type LitElement } from 'lit';
import { mount as mountSvelte, tick, unmount as unmountSvelte } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import VueCompositionCard from '../../src/vue/components/CompositionCard.vue';
import VueCompositionLab from '../../src/vue/components/CompositionLab.vue';
import ReactCompositionLab, { CompositionCard as ReactCompositionCard } from '../../src/react/components/CompositionLab';
import PreactCompositionLab, { CompositionCard as PreactCompositionCard } from '../../src/preact/components/CompositionLab';
import SolidCompositionLab, { CompositionCard as SolidCompositionCard } from '../../src/solid/components/CompositionLab';
import SvelteCompositionLab from '../../src/svelte/components/CompositionLab.svelte';
import SvelteCompositionCardFixture from './fixtures/SvelteCompositionCardFixture.svelte';
import '../../src/lit/components/lit-composition-card';
import '../../src/lit/components/lit-composition-lab';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Mounted = {
    readonly target: HTMLElement;
    perform(action: () => void): void | Promise<void>;
    unmount(): void | Promise<void>;
};

type FrameworkCase = {
    readonly name: string;
    mountCard(onAction: () => void): Mounted | Promise<Mounted>;
    mountLab(): Mounted | Promise<Mounted>;
};

function createTarget(): HTMLElement {
    const target = document.createElement('div');
    document.body.appendChild(target);
    return target;
}

async function flushLit(): Promise<void> {
    await Promise.resolve();
    const elements = Array.from(document.querySelectorAll('*')).filter((element): element is LitElement => 'updateComplete' in element);
    await Promise.all(elements.map(element => element.updateComplete));
    await Promise.resolve();
}

function sentinel(name: string, onAction?: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.sentinel = name;
    button.textContent = `${name} sentinel`;
    if (onAction !== undefined) button.addEventListener('click', onAction);
    return button;
}

const frameworkCases: readonly FrameworkCase[] = [
    {
        name: 'vue',
        async mountCard(onAction) {
            const target = createTarget();
            const app = createApp({
                render: () => vueElement(VueCompositionCard, null, {
                    header: ({ region }: { region: string }) => vueElement('button', { type: 'button', key: region, 'data-sentinel': 'header' }, 'Header sentinel'),
                    default: ({ region }: { region: string }) => vueElement('button', { type: 'button', key: region, 'data-sentinel': 'body' }, 'Body sentinel'),
                    details: ({ region }: { region: string }) => vueElement('button', { type: 'button', key: region, 'data-sentinel': 'details' }, 'Details sentinel'),
                    actions: ({ region }: { region: string }) => vueElement('button', { type: 'button', key: region, 'data-sentinel': 'actions', onClick: onAction }, 'Actions sentinel'),
                }),
            });
            app.mount(target);
            await nextTick();
            return { target, perform: async action => { action(); await nextTick(); }, unmount: () => { app.unmount(); target.remove(); } };
        },
        async mountLab() {
            const target = createTarget();
            const app = createApp({ render: () => vueElement(VueCompositionLab, { nickname: 'vue-composition' }) });
            app.mount(target);
            await nextTick();
            return { target, perform: async action => { action(); await nextTick(); }, unmount: () => { app.unmount(); target.remove(); } };
        },
    },
    {
        name: 'react',
        mountCard(onAction) {
            const target = createTarget();
            const root = createRoot(target);
            reactAct(() => root.render(reactElement(ReactCompositionCard, {
                header: reactElement('button', { type: 'button', 'data-sentinel': 'header' }, 'Header sentinel'),
                details: reactElement('button', { type: 'button', 'data-sentinel': 'details' }, 'Details sentinel'),
                actions: reactElement('button', { type: 'button', 'data-sentinel': 'actions', onClick: onAction }, 'Actions sentinel'),
            }, reactElement('button', { type: 'button', 'data-sentinel': 'body' }, 'Body sentinel'))));
            return { target, perform: action => { reactAct(action); }, unmount: () => { reactAct(() => root.unmount()); target.remove(); } };
        },
        mountLab() {
            const target = createTarget();
            const root = createRoot(target);
            reactAct(() => root.render(reactElement(ReactCompositionLab, { nickname: 'react-composition' })));
            return { target, perform: action => { reactAct(action); }, unmount: () => { reactAct(() => root.unmount()); target.remove(); } };
        },
    },
    {
        name: 'preact',
        async mountCard(onAction) {
            const target = createTarget();
            await preactAct(() => renderPreact(preactElement(PreactCompositionCard, {
                header: preactElement('button', { type: 'button', 'data-sentinel': 'header' }, 'Header sentinel'),
                details: preactElement('button', { type: 'button', 'data-sentinel': 'details' }, 'Details sentinel'),
                actions: preactElement('button', { type: 'button', 'data-sentinel': 'actions', onClick: onAction }, 'Actions sentinel'),
            }, preactElement('button', { type: 'button', 'data-sentinel': 'body' }, 'Body sentinel')), target));
            return { target, perform: async action => { await preactAct(action); }, unmount: async () => { await preactAct(() => renderPreact(null, target)); target.remove(); } };
        },
        async mountLab() {
            const target = createTarget();
            await preactAct(() => renderPreact(preactElement(PreactCompositionLab, { nickname: 'preact-composition' }), target));
            return { target, perform: async action => { await preactAct(action); }, unmount: async () => { await preactAct(() => renderPreact(null, target)); target.remove(); } };
        },
    },
    {
        name: 'lit',
        async mountCard(onAction) {
            const target = createTarget();
            const card = document.createElement('lit-composition-card');
            card.header = html`<button type="button" data-sentinel="header">Header sentinel</button>`;
            card.body = html`<button type="button" data-sentinel="body">Body sentinel</button>`;
            card.details = html`<button type="button" data-sentinel="details">Details sentinel</button>`;
            card.actions = html`<button type="button" data-sentinel="actions" @click=${onAction}>Actions sentinel</button>`;
            target.appendChild(card);
            await flushLit();
            return { target, perform: async action => { action(); await flushLit(); }, unmount: async () => { target.remove(); await flushLit(); } };
        },
        async mountLab() {
            const target = createTarget();
            const lab = document.createElement('lit-composition-lab');
            lab.nickname = 'lit-composition';
            target.appendChild(lab);
            await flushLit();
            return { target, perform: async action => { action(); await flushLit(); }, unmount: async () => { target.remove(); await flushLit(); } };
        },
    },
    {
        name: 'svelte',
        async mountCard(onAction) {
            const target = createTarget();
            const instance = mountSvelte(SvelteCompositionCardFixture, { target, props: { onAction } });
            await tick();
            return { target, perform: async action => { action(); await tick(); }, unmount: async () => { await unmountSvelte(instance); target.remove(); } };
        },
        async mountLab() {
            const target = createTarget();
            const instance = mountSvelte(SvelteCompositionLab, { target, props: { nickname: 'svelte-composition' } });
            await tick();
            return { target, perform: async action => { action(); await tick(); }, unmount: async () => { await unmountSvelte(instance); target.remove(); } };
        },
    },
    {
        name: 'solid',
        mountCard(onAction) {
            const target = createTarget();
            const dispose = renderSolid(() => createComponent(SolidCompositionCard, {
                header: sentinel('header'),
                children: sentinel('body'),
                details: sentinel('details'),
                actions: sentinel('actions', onAction),
            }), target);
            return { target, perform: async action => { action(); await Promise.resolve(); }, unmount: () => { dispose(); target.remove(); } };
        },
        mountLab() {
            const target = createTarget();
            const dispose = renderSolid(() => createComponent(SolidCompositionLab, { nickname: 'solid-composition' }), target);
            return { target, perform: async action => { action(); await Promise.resolve(); }, unmount: () => { dispose(); target.remove(); } };
        },
    },
];

function byRole<T extends Element>(root: ParentNode, role: string): T {
    const element = root.querySelector<T>(`[data-ft-role="${role}"]`);
    if (element === null) throw new Error(`Missing data-ft-role=${role}`);
    return element;
}

for (const framework of frameworkCases) {
    describe(`${framework.name} Composition Card`, () => {
        it('projects four standalone sentinel groups into fixed regions', async () => {
            const onAction = vi.fn();
            const mounted = await framework.mountCard(onAction);
            try {
                const article = byRole<HTMLElement>(mounted.target, 'composition-card');
                expect(Array.from(article.children, child => `${child.tagName.toLowerCase()}:${child.getAttribute('data-ft-role')}`)).toEqual([
                    'header:composition-card-header',
                    'div:composition-card-body',
                    'div:composition-card-details',
                    'footer:composition-card-footer',
                ]);
                const regions = [
                    ['composition-card-header', 'header'],
                    ['composition-card-body', 'body'],
                    ['composition-card-details', 'details'],
                    ['composition-card-footer', 'actions'],
                ] as const;
                for (const [role, name] of regions) expect(byRole(article, role).querySelector(`[data-sentinel="${name}"]`)).not.toBeNull();
                for (const button of article.querySelectorAll<HTMLButtonElement>('[data-sentinel]')) await mounted.perform(() => button.click());
                expect(onAction).toHaveBeenCalledOnce();
            } finally {
                await mounted.unmount();
            }
        });

        it('renders the shared product contract and local interactions', async () => {
            const mounted = await framework.mountLab();
            try {
                const root = mounted.target;
                expect(byRole(root, 'composition-description').textContent).toBe('Compose one preview card from projected content and local actions.');
                expect(byRole(root, 'composition-title').textContent).toBe('Deployment preview');
                expect(byRole(root, 'composition-body').textContent).toBe('Preview the next Component Lab release.');
                expect(byRole(root, 'composition-badge').textContent).toBe('Ready');
                expect(byRole(root, 'composition-action-count').textContent?.replace(/\s+/gu, ' ').trim()).toBe('Actions: 0');
                expect(byRole(root, 'composition-status').textContent).toBe('No preview actions yet.');
                expect(byRole(root, 'composition-details-content').childElementCount).toBe(0);

                const toggle = byRole<HTMLButtonElement>(root, 'composition-details-toggle');
                const run = byRole<HTMLButtonElement>(root, 'composition-run');
                const reset = byRole<HTMLButtonElement>(root, 'composition-reset');
                expect([toggle.textContent, toggle.getAttribute('aria-expanded'), reset.disabled]).toEqual(['Show details', 'false', true]);
                expect(toggle.getAttribute('aria-controls')).toBe(byRole(root, 'composition-details-content').id);

                await mounted.perform(() => toggle.click());
                expect([toggle.textContent, toggle.getAttribute('aria-expanded')]).toEqual(['Hide details', 'true']);
                expect(Array.from(byRole(root, 'composition-details-list').querySelectorAll('dt,dd'), element => element.textContent)).toEqual([
                    'Environment', 'Preview', 'Change', 'Five-tab component lab',
                ]);
                await mounted.perform(() => run.click());
                expect(byRole(root, 'composition-badge').textContent).toBe('Updated');
                expect(byRole(root, 'composition-action-count').textContent?.replace(/\s+/gu, ' ').trim()).toBe('Actions: 1');
                expect(byRole(root, 'composition-status').textContent).toBe('Preview action recorded. 1 total.');
                expect(reset.disabled).toBe(false);

                await mounted.perform(() => reset.click());
                expect([toggle.textContent, toggle.getAttribute('aria-expanded'), byRole(root, 'composition-badge').textContent]).toEqual(['Show details', 'false', 'Ready']);
                expect(byRole(root, 'composition-details-content').childElementCount).toBe(0);
                expect(byRole(root, 'composition-action-count').textContent?.replace(/\s+/gu, ' ').trim()).toBe('Actions: 0');
                expect(byRole(root, 'composition-status').textContent).toBe('No preview actions yet.');
                expect(reset.disabled).toBe(true);
            } finally {
                await mounted.unmount();
            }
        });
    });
}
