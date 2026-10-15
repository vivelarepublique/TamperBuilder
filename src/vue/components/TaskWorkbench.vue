<script setup lang="ts">
    import { computed, nextTick, ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import {
        filterTasks,
        getTaskFocusTarget,
        isInitialTaskCollection,
        isTaskFilter,
        normalizeTaskSearch,
        TASK_FILTERS,
        TASK_PRIORITIES,
        TASK_WORKBENCH_DESCRIPTION,
        type TaskFilter,
        type TaskFocusTarget,
        type TaskValidationError,
    } from '../../common/components/workbench';
    import { useWorkbenchStore } from '../store/workbenchStore';

    const props = defineProps<{ nickname: string }>();
    const store = useWorkbenchStore();
    const { tasks, nextId, hasCompleted } = storeToRefs(store);
    const title = ref('');
    const priority = ref('medium');
    const search = ref('');
    const filter = ref<TaskFilter>('all');
    const validationError = ref<TaskValidationError | null>(null);
    const visibleTasks = computed(() => filterTasks(tasks.value, search.value, filter.value));
    const done = computed(() => tasks.value.filter(task => task.completed).length);
    const open = computed(() => tasks.value.length - done.value);
    const resetDisabled = computed(
        () =>
            isInitialTaskCollection(tasks.value, nextId.value) &&
            title.value === '' &&
            priority.value === 'medium' &&
            search.value === '' &&
            filter.value === 'all' &&
            validationError.value === null,
    );
    const errorId = computed(() => `ft-${props.nickname}-task-error`);

    function focusTarget(target: TaskFocusTarget): void {
        const selector =
            target.kind === 'add'
                ? '[data-ft-role="task-add"]'
                : `[data-task-id="${target.taskId}"][data-ft-role="task-${target.control}"]`;
        document.querySelector<HTMLElement>(`#ft-${props.nickname}-panel-task ${selector}`)?.focus();
    }

    async function submit(): Promise<void> {
        const error = store.add({ title: title.value, priority: priority.value });
        validationError.value = error;
        await nextTick();
        if (error !== null) {
            document.getElementById(`ft-${props.nickname}-task-${error.field}`)?.focus();
            return;
        }
        title.value = '';
        priority.value = 'medium';
        await nextTick();
        document.getElementById(`ft-${props.nickname}-task-title`)?.focus();
    }

    function clearValidation(): void {
        validationError.value = null;
    }

    function updateSearch(event: Event): void {
        search.value = normalizeTaskSearch((event.currentTarget as HTMLInputElement).value);
    }

    function updateFilter(event: Event): void {
        const value = (event.currentTarget as HTMLInputElement).value;
        if (isTaskFilter(value)) filter.value = value;
    }

    async function toggle(taskId: number): Promise<void> {
        const before = [...visibleTasks.value];
        store.toggle(taskId);
        await nextTick();
        focusTarget(getTaskFocusTarget(before, visibleTasks.value, taskId, 'toggle'));
    }

    async function remove(taskId: number): Promise<void> {
        const before = [...visibleTasks.value];
        store.remove(taskId);
        await nextTick();
        focusTarget(getTaskFocusTarget(before, visibleTasks.value, taskId, 'delete'));
    }

    async function clearCompleted(): Promise<void> {
        if (!hasCompleted.value) return;
        store.clearCompleted();
        await nextTick();
        document.getElementById(`ft-${props.nickname}-task-title`)?.focus();
    }

    async function reset(): Promise<void> {
        if (resetDisabled.value) return;
        store.reset();
        title.value = '';
        priority.value = 'medium';
        search.value = '';
        filter.value = 'all';
        validationError.value = null;
        await nextTick();
        document.getElementById(`ft-${props.nickname}-task-title`)?.focus();
    }
</script>

<template>
    <section class="ft-showcase-task-workbench" data-ft-role="task-workbench">
        <p :id="`ft-${nickname}-task-description`" data-ft-role="task-description">{{ TASK_WORKBENCH_DESCRIPTION }}</p>
        <form class="ft-showcase-task-form" data-ft-role="task-form" novalidate @submit.prevent="submit">
            <div class="ft-showcase-field" data-ft-role="task-title-field">
                <label class="ft-showcase-label" :for="`ft-${nickname}-task-title`">Task title</label>
                <input
                    :id="`ft-${nickname}-task-title`"
                    v-model="title"
                    class="ft-showcase-input"
                    data-ft-role="task-title"
                    :aria-invalid="validationError?.field === 'title' ? 'true' : undefined"
                    :aria-errormessage="validationError?.field === 'title' ? errorId : undefined"
                    @input="clearValidation"
                >
                <div data-ft-role="task-title-error-slot">
                    <div v-if="validationError?.field === 'title'" :id="errorId" class="ft-showcase-error" role="alert">{{ validationError.message }}</div>
                </div>
            </div>
            <div class="ft-showcase-field" data-ft-role="task-priority-field">
                <label class="ft-showcase-label" :for="`ft-${nickname}-task-priority`">Priority</label>
                <select
                    :id="`ft-${nickname}-task-priority`"
                    v-model="priority"
                    class="ft-showcase-select"
                    data-ft-role="task-priority"
                    :aria-invalid="validationError?.field === 'priority' ? 'true' : undefined"
                    :aria-errormessage="validationError?.field === 'priority' ? errorId : undefined"
                    @change="clearValidation"
                >
                    <option v-for="option in TASK_PRIORITIES" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
                <div data-ft-role="task-priority-error-slot">
                    <div v-if="validationError?.field === 'priority'" :id="errorId" class="ft-showcase-error" role="alert">{{ validationError.message }}</div>
                </div>
            </div>
            <button class="ft-showcase-button" data-ft-role="task-add" type="submit">Add task</button>
        </form>
        <div class="ft-showcase-task-filters" data-ft-role="task-filters">
            <div class="ft-showcase-field" data-ft-role="task-search-field">
                <label class="ft-showcase-label" :for="`ft-${nickname}-task-search`">Search tasks</label>
                <input :id="`ft-${nickname}-task-search`" :value="search" class="ft-showcase-input" data-ft-role="task-search" @input="updateSearch">
            </div>
            <fieldset data-ft-role="task-filter">
                <legend>Task status</legend>
                <label v-for="option in TASK_FILTERS" :key="option.value" :for="`ft-${nickname}-task-status-${option.value}`">
                    <input
                        :id="`ft-${nickname}-task-status-${option.value}`"
                        class="ft-showcase-choice"
                        type="radio"
                        :name="`ft-${nickname}-task-status`"
                        :value="option.value"
                        :checked="filter === option.value"
                        @change="updateFilter"
                    >
                    {{ option.label }}
                </label>
            </fieldset>
        </div>
        <p data-ft-role="task-summary">{{ open }} open · {{ done }} done · {{ tasks.length }} total</p>
        <progress
            class="ft-showcase-progress"
            data-ft-role="task-progress"
            aria-label="Completed tasks"
            :max="tasks.length || 1"
            :value="done"
            :aria-valuetext="`${done} of ${tasks.length} tasks complete`"
        />
        <ul v-if="visibleTasks.length > 0" class="ft-showcase-task-list" data-ft-role="task-list">
            <li v-for="task in visibleTasks" :key="task.id" class="ft-showcase-task-row" data-ft-role="task-row">
                <input
                    class="ft-showcase-choice"
                    type="checkbox"
                    data-ft-role="task-toggle"
                    :data-task-id="task.id"
                    :checked="task.completed"
                    :aria-label="`${task.title} completed`"
                    @change="toggle(task.id)"
                >
                <span class="ft-showcase-task-title">{{ task.title }}</span>
                <span>{{ TASK_PRIORITIES.find(option => option.value === task.priority)?.label }}</span>
                <button
                    class="ft-showcase-button"
                    data-ft-role="task-delete"
                    :data-task-id="task.id"
                    type="button"
                    :aria-label="`Delete task ${task.id}: ${task.title}`"
                    @click="remove(task.id)"
                >
                    Delete
                </button>
            </li>
        </ul>
        <p v-else data-ft-role="task-empty">No tasks match this view.</p>
        <div class="ft-showcase-actions" data-ft-role="task-actions">
            <button class="ft-showcase-button" data-ft-role="task-clear" type="button" :disabled="!hasCompleted" @click="clearCompleted">Clear completed</button>
            <button class="ft-showcase-button" data-ft-role="task-reset" type="button" :disabled="resetDisabled" @click="reset">Reset sample</button>
        </div>
    </section>
</template>
