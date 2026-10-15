<script lang="ts">
    import { onMount, tick } from 'svelte';
    import type { RenderLabDependencies } from '../../common/components/benchmark';
    import {
        COMPONENT_LAB_TABS,
        createPanelLifecycleRegistration,
        focusAndScrollComponentLabTab,
        getComponentLabTabForKey,
        handleDialogTab,
        keepFocusInsideDialog,
        restoreDialogOpener,
        type ComponentLabTabKey,
        type PanelLifecycleHandle,
        type PanelLifecycleRegistration,
    } from '../../common/components/dialog';
    import type { LifecycleLabDependencies } from '../../common/components/lifecycle';
    import type { PageBridgeEnvironment } from '../../common/components/pageBridge';
    import type { SvelteWorkbenchModel } from '../store/workbench.svelte';
    import CompositionLab from './CompositionLab.svelte';
    import LifecycleLab from './LifecycleLab.svelte';
    import PageBridgeLab from './PageBridgeLab.svelte';
    import RenderLab from './RenderLab.svelte';
    import TaskWorkbench from './TaskWorkbench.svelte';

    let { nickname, dependencies, pageBridgeEnvironment, lifecycleDependencies, registerRootLifecycle, model, opener, onclose }: {
        nickname: string;
        dependencies: RenderLabDependencies;
        pageBridgeEnvironment: PageBridgeEnvironment;
        lifecycleDependencies: LifecycleLabDependencies;
        registerRootLifecycle: PanelLifecycleRegistration['register'];
        model: SvelteWorkbenchModel;
        opener: HTMLElement;
        onclose: () => void;
    } = $props();
    const panelRegistration = createPanelLifecycleRegistration();
    let unregisterRoot: (() => void) | null = null;
    let dialog: HTMLDialogElement;
    let panelHandle = $state<PanelLifecycleHandle>();
    let activeTab = $state<ComponentLabTabKey>('task');

    $effect(() => {
        const handle = panelHandle;
        if (handle === undefined) return;
        return panelRegistration.register(handle);
    });

    function close(): void {
        panelRegistration.deactivateActivePanel();
        activeTab = 'task';
        onclose();
    }

    async function selectTab(tab: ComponentLabTabKey, focus = true): Promise<void> {
        if (activeTab === tab) return;
        panelRegistration.deactivateActivePanel();
        activeTab = tab;
        if (focus) {
            await tick();
            const nextTab = document.getElementById(`ft-${nickname}-tab-${tab}`);
            if (nextTab !== null) focusAndScrollComponentLabTab(nextTab);
        }
    }

    function tabKey(event: KeyboardEvent): void {
        const nextTab = getComponentLabTabForKey(activeTab, event.key);
        if (nextTab === null) return;
        event.preventDefault();
        void selectTab(nextTab);
    }

    onMount(() => {
        unregisterRoot = registerRootLifecycle({ deactivate: panelRegistration.deactivateActivePanel });
        const focusGuard = (event: FocusEvent) => keepFocusInsideDialog(event, dialog);
        dialog.showModal();
        document.addEventListener('focusin', focusGuard, true);
        void tick().then(() => document.getElementById(`ft-${nickname}-tab-task`)?.focus());
        return () => {
            panelRegistration.deactivateActivePanel();
            unregisterRoot?.();
            unregisterRoot = null;
            document.removeEventListener('focusin', focusGuard, true);
            if (dialog.open) dialog.close();
            restoreDialogOpener(opener);
        };
    });
</script>

<dialog bind:this={dialog} class="ft-showcase-dialog" aria-labelledby={`ft-${nickname}-dialog-title`} tabindex="-1" data-ft-role="dialog" oncancel={(event) => { event.preventDefault(); close(); }} onclick={(event) => { if (event.target === event.currentTarget) close(); }} onkeydown={(event) => handleDialogTab(event, dialog)}>
    <div class="ft-showcase-header"><h2 id={`ft-${nickname}-dialog-title`}>Component lab</h2><button class="ft-showcase-button" type="button" aria-label="Close component lab" onclick={close}>Close</button></div>
    <div class="ft-showcase-tabs" role="tablist" tabindex="-1" aria-label="Component lab sections" onkeydown={tabKey}>
        {#each COMPONENT_LAB_TABS as tab (tab.key)}<button id={`ft-${nickname}-tab-${tab.key}`} class="ft-showcase-tab" data-ft-role={`tab-${tab.key}`} role="tab" type="button" aria-selected={activeTab === tab.key} aria-controls={`ft-${nickname}-panel-${tab.key}`} tabindex={activeTab === tab.key ? 0 : -1} onclick={() => void selectTab(tab.key, false)}>{tab.label}</button>{/each}
    </div>
    <div id={`ft-${nickname}-panel-${activeTab}`} role="tabpanel" aria-labelledby={`ft-${nickname}-tab-${activeTab}`} aria-describedby={`ft-${nickname}-${activeTab}-description`}>
        {#if activeTab === 'task'}<TaskWorkbench {nickname} {model} />
        {:else if activeTab === 'render'}<RenderLab bind:this={panelHandle} {nickname} {dependencies} />
        {:else if activeTab === 'page-bridge'}<PageBridgeLab bind:this={panelHandle} {nickname} environment={pageBridgeEnvironment} />
        {:else if activeTab === 'composition'}<CompositionLab {nickname} />
        {:else}<LifecycleLab bind:this={panelHandle} {nickname} dependencies={lifecycleDependencies} />{/if}
    </div>
</dialog>
