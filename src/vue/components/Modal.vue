<script setup lang="ts">
    import { nextTick, onBeforeUnmount, ref } from 'vue';
    import type { RenderLabDependencies } from '../../common/components/benchmark';
    import { handleDialogTab, keepFocusInsideDialog, restoreDialogOpener } from '../../common/components/dialog';
    import RenderLab from './RenderLab.vue';
    import TaskWorkbench from './TaskWorkbench.vue';

    const props = defineProps<{ nickname: string; dependencies?: RenderLabDependencies }>();
    const emit = defineEmits<{ expanded: [value: boolean] }>();
    const dialog = ref<HTMLDialogElement | null>(null);
    const activeTab = ref<'task' | 'render'>('task');
    const opened = ref(false);
    let opener: HTMLElement | null = null;

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
        opened.value = false;
        activeTab.value = 'task';
        document.removeEventListener('focusin', focusGuard, true);
        if (dialog.value?.open) dialog.value.close();
        emit('expanded', false);
        opener = null;
        if (restoreFocus) restoreDialogOpener(source);
    }

    function selectTab(tab: 'task' | 'render', focus = true): void {
        activeTab.value = tab;
        if (focus) void nextTick(() => document.getElementById(`ft-${props.nickname}-tab-${tab}`)?.focus());
    }

    function onTabKey(event: KeyboardEvent): void {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            selectTab(activeTab.value === 'task' ? 'render' : 'task');
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            selectTab(event.key === 'Home' ? 'task' : 'render');
        }
    }

    function onCancel(event: Event): void {
        event.preventDefault();
        close();
    }

    function onDialogClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) close();
    }

    defineExpose({ open, close });
    onBeforeUnmount(() => close(false));
</script>

<template>
    <dialog
        ref="dialog"
        class="ft-showcase-dialog"
        :aria-labelledby="`ft-${nickname}-dialog-title`"
        tabindex="-1"
        data-ft-role="dialog"
        @cancel="onCancel"
        @click="onDialogClick"
        @keydown="dialog && handleDialogTab($event, dialog)"
    >
        <div class="ft-showcase-header">
            <h2 :id="`ft-${nickname}-dialog-title`">Component lab</h2>
            <button class="ft-showcase-button" type="button" aria-label="Close component lab" @click="close()">Close</button>
        </div>
        <div class="ft-showcase-tabs" role="tablist" aria-label="Component lab sections" @keydown="onTabKey">
            <button
                :id="`ft-${nickname}-tab-task`"
                class="ft-showcase-tab"
                data-ft-role="tab-task"
                role="tab"
                type="button"
                :aria-selected="activeTab === 'task'"
                :aria-controls="`ft-${nickname}-panel-task`"
                :tabindex="activeTab === 'task' ? 0 : -1"
                @click="selectTab('task', false)"
            >
                Task
            </button>
            <button
                :id="`ft-${nickname}-tab-render`"
                class="ft-showcase-tab"
                data-ft-role="tab-render"
                role="tab"
                type="button"
                :aria-selected="activeTab === 'render'"
                :aria-controls="`ft-${nickname}-panel-render`"
                :tabindex="activeTab === 'render' ? 0 : -1"
                @click="selectTab('render', false)"
            >
                Render
            </button>
        </div>
        <div
            v-if="opened && activeTab === 'task'"
            :id="`ft-${nickname}-panel-task`"
            role="tabpanel"
            :aria-labelledby="`ft-${nickname}-tab-task`"
            :aria-describedby="`ft-${nickname}-task-description`"
        >
            <TaskWorkbench :nickname="nickname" />
        </div>
        <div
            v-else-if="opened"
            :id="`ft-${nickname}-panel-render`"
            role="tabpanel"
            :aria-labelledby="`ft-${nickname}-tab-render`"
            :aria-describedby="`ft-${nickname}-render-description`"
        >
            <RenderLab :nickname="nickname" :dependencies="dependencies" />
        </div>
    </dialog>
</template>
