<script lang="ts">
    import svelteLogo from '../assets/svg/svelte.svg';
    import type { RenderLabDependencies } from '../common/components/benchmark';
    import type { PanelLifecycleRegistration } from '../common/components/dialog';
    import type { LifecycleLabDependencies } from '../common/components/lifecycle';
    import type { PageBridgeEnvironment } from '../common/components/pageBridge';
    import Modal from './components/Modal.svelte';
    import { createWorkbenchModel } from './store/workbench.svelte';
    let { nickname, dependencies, pageBridgeEnvironment, lifecycleDependencies, registerRootLifecycle }: {
        nickname: string;
        dependencies: RenderLabDependencies;
        pageBridgeEnvironment: PageBridgeEnvironment;
        lifecycleDependencies: LifecycleLabDependencies;
        registerRootLifecycle: PanelLifecycleRegistration['register'];
    } = $props();
    const model = createWorkbenchModel();
    let open = $state(false);
    let launcher = $state<HTMLButtonElement>();
</script>

<button bind:this={launcher} class="ft-showcase-launcher" data-ft-role="launcher" type="button" aria-label="Open Svelte component lab" aria-haspopup="dialog" aria-expanded={open} onclick={() => open = true}><img src={svelteLogo} class="ft-showcase-launcher-image framework-test-logo-animation" alt="" aria-hidden="true"><span class="ft-showcase-launcher-label">Open</span></button>
{#if open && launcher}<Modal {nickname} {dependencies} {pageBridgeEnvironment} {lifecycleDependencies} {registerRootLifecycle} {model} opener={launcher} onclose={() => open = false} />{/if}
