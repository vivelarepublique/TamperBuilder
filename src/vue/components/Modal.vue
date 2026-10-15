<script setup lang="ts">
    import { nextTick, onBeforeUnmount, ref } from 'vue';
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
    import CompositionLab from './CompositionLab.vue';
    import LifecycleLab from './LifecycleLab.vue';
    import PageBridgeLab from './PageBridgeLab.vue';
    import RenderLab from './RenderLab.vue';
    import TaskWorkbench from './TaskWorkbench.vue';

    const props = defineProps<{
        nickname: string;
        dependencies: RenderLabDependencies;
        pageBridgeEnvironment: PageBridgeEnvironment;
        lifecycleDependencies: LifecycleLabDependencies;
        registerRootLifecycle: PanelLifecycleRegistration['register'];
    }>();
    const emit = defineEmits<{ expanded: [value: boolean] }>();
    const dialog = ref<HTMLDialogElement | null>(null);
    const activeTab = ref<ComponentLabTabKey>('task');
    const opened = ref(false);
    const panelRegistration = createPanelLifecycleRegistration();
    const unregisterRoot = props.registerRootLifecycle({ deactivate: panelRegistration.deactivateActivePanel });
    let unregisterPanel: (() => void) | null = null;
    let opener: HTMLElement | null = null;

    function registerPanelHandle(handle: unknown): void {
        unregisterPanel?.();
        unregisterPanel = null;
        if (handle !== null && typeof handle === 'object' && 'deactivate' in handle && typeof (handle as PanelLifecycleHandle).deactivate === 'function') {
            unregisterPanel = panelRegistration.register(handle as PanelLifecycleHandle);
        }
    }

    function focusGuard(event: FocusEvent): void {
        if (dialog.value !== null) keepFocusInsideDialog(event, dialog.value);
    }

    async function open(source: HTMLElement): Promise<void> {
        opener = source;
        activeTab.value = 'task';
        opened.value = true;
        await nextTick();
        dialog.value?.showModal();
        document.addEventListener('focusin', focusGuard, true);
        emit('expanded', true);
        await nextTick();
        document.getElementById(`ft-${props.nickname}-tab-task`)?.focus();
    }

    function close(restoreFocus = true): void {
        const source = opener;
        panelRegistration.deactivateActivePanel();
        opened.value = false;
        activeTab.value = 'task';
        document.removeEventListener('focusin', focusGuard, true);
        if (dialog.value?.open) dialog.value.close();
        emit('expanded', false);
        opener = null;
        if (restoreFocus) restoreDialogOpener(source);
    }

    function selectTab(tab: ComponentLabTabKey, focus = true): void {
        if (activeTab.value === tab) return;
        panelRegistration.deactivateActivePanel();
        activeTab.value = tab;
        if (focus) void nextTick(() => {
            const nextTab = document.getElementById(`ft-${props.nickname}-tab-${tab}`);
            if (nextTab !== null) focusAndScrollComponentLabTab(nextTab);
        });
    }

    function onTabKey(event: KeyboardEvent): void {
        const nextTab = getComponentLabTabForKey(activeTab.value, event.key);
        if (nextTab === null) return;
        event.preventDefault();
        selectTab(nextTab);
    }

    function onCancel(event: Event): void {
        event.preventDefault();
        close();
    }

    function onDialogClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) close();
    }

    defineExpose({ open, close });
    onBeforeUnmount(() => {
        close(false);
        unregisterPanel?.();
        unregisterRoot();
    });
</script>

<template>
    <dialog ref="dialog" class="ft-showcase-dialog" :aria-labelledby="`ft-${nickname}-dialog-title`" tabindex="-1" data-ft-role="dialog" @cancel="onCancel" @click="onDialogClick" @keydown="dialog && handleDialogTab($event, dialog)">
        <div class="ft-showcase-header"><h2 :id="`ft-${nickname}-dialog-title`">Component lab</h2><button class="ft-showcase-button" type="button" aria-label="Close component lab" @click="close()">Close</button></div>
        <div class="ft-showcase-tabs" role="tablist" tabindex="-1" aria-label="Component lab sections" @keydown="onTabKey">
            <button v-for="tab in COMPONENT_LAB_TABS" :id="`ft-${nickname}-tab-${tab.key}`" :key="tab.key" class="ft-showcase-tab" :data-ft-role="`tab-${tab.key}`" role="tab" type="button" :aria-selected="activeTab === tab.key" :aria-controls="`ft-${nickname}-panel-${tab.key}`" :tabindex="activeTab === tab.key ? 0 : -1" @click="selectTab(tab.key, false)">{{ tab.label }}</button>
        </div>
        <div v-if="opened" :id="`ft-${nickname}-panel-${activeTab}`" role="tabpanel" :aria-labelledby="`ft-${nickname}-tab-${activeTab}`" :aria-describedby="`ft-${nickname}-${activeTab}-description`">
            <TaskWorkbench v-if="activeTab === 'task'" :nickname="nickname" />
            <RenderLab v-else-if="activeTab === 'render'" :ref="registerPanelHandle" :nickname="nickname" :dependencies="dependencies" />
            <PageBridgeLab v-else-if="activeTab === 'page-bridge'" :ref="registerPanelHandle" :nickname="nickname" :environment="pageBridgeEnvironment" />
            <CompositionLab v-else-if="activeTab === 'composition'" :nickname="nickname" />
            <LifecycleLab v-else :ref="registerPanelHandle" :nickname="nickname" :dependencies="lifecycleDependencies" />
        </div>
    </dialog>
</template>
