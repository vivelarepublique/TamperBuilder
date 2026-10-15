<script lang="ts">
    import { onMount, tick } from 'svelte';
    import type { RenderLabDependencies } from '../../common/components/benchmark';
    import { handleDialogTab, keepFocusInsideDialog, restoreDialogOpener } from '../../common/components/dialog';
    import type { SvelteWorkbenchModel } from '../store/workbench.svelte';
    import RenderLab from './RenderLab.svelte';
    import TaskWorkbench from './TaskWorkbench.svelte';

    let { nickname, dependencies, model, opener, onclose }: { nickname: string; dependencies: RenderLabDependencies; model: SvelteWorkbenchModel; opener: HTMLElement; onclose: () => void } = $props();
    let dialog: HTMLDialogElement;
    let activeTab = $state<'task' | 'render'>('task');
    function close(): void { activeTab = 'task'; onclose(); }
    async function selectTab(tab: 'task' | 'render', focus = true): Promise<void> { activeTab = tab; if (focus) { await tick(); document.getElementById(`ft-${nickname}-tab-${tab}`)?.focus(); } }
    function tabKey(event: KeyboardEvent): void { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); void selectTab(activeTab === 'task' ? 'render' : 'task'); } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); void selectTab(event.key === 'Home' ? 'task' : 'render'); } }
    onMount(() => { const focusGuard = (event: FocusEvent) => keepFocusInsideDialog(event, dialog); dialog.showModal(); document.addEventListener('focusin', focusGuard, true); void tick().then(() => document.getElementById(`ft-${nickname}-tab-task`)?.focus()); return () => { document.removeEventListener('focusin', focusGuard, true); if (dialog.open) dialog.close(); restoreDialogOpener(opener); }; });
</script>

<dialog bind:this={dialog} class="ft-showcase-dialog" aria-labelledby={`ft-${nickname}-dialog-title`} tabindex="-1" data-ft-role="dialog" oncancel={(event) => { event.preventDefault(); close(); }} onclick={(event) => { if (event.target === event.currentTarget) close(); }} onkeydown={(event) => handleDialogTab(event, dialog)}>
    <div class="ft-showcase-header"><h2 id={`ft-${nickname}-dialog-title`}>Component lab</h2><button class="ft-showcase-button" type="button" aria-label="Close component lab" onclick={close}>Close</button></div>
    <div class="ft-showcase-tabs" role="tablist" tabindex="-1" aria-label="Component lab sections" onkeydown={tabKey}><button id={`ft-${nickname}-tab-task`} class="ft-showcase-tab" data-ft-role="tab-task" role="tab" type="button" aria-selected={activeTab === 'task'} aria-controls={`ft-${nickname}-panel-task`} tabindex={activeTab === 'task' ? 0 : -1} onclick={() => void selectTab('task', false)}>Task</button><button id={`ft-${nickname}-tab-render`} class="ft-showcase-tab" data-ft-role="tab-render" role="tab" type="button" aria-selected={activeTab === 'render'} aria-controls={`ft-${nickname}-panel-render`} tabindex={activeTab === 'render' ? 0 : -1} onclick={() => void selectTab('render', false)}>Render</button></div>
    {#if activeTab === 'task'}<div id={`ft-${nickname}-panel-task`} role="tabpanel" aria-labelledby={`ft-${nickname}-tab-task`} aria-describedby={`ft-${nickname}-task-description`}><TaskWorkbench {nickname} {model} /></div>{:else}<div id={`ft-${nickname}-panel-render`} role="tabpanel" aria-labelledby={`ft-${nickname}-tab-render`} aria-describedby={`ft-${nickname}-render-description`}><RenderLab {nickname} {dependencies} /></div>{/if}
</dialog>
