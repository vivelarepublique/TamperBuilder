<script lang="ts">
    import { tick } from 'svelte';
    import { filterTasks, getTaskFocusTarget, isInitialTaskCollection, isTaskFilter, normalizeTaskSearch, TASK_FILTERS, TASK_PRIORITIES, TASK_WORKBENCH_DESCRIPTION, type TaskFilter, type TaskFocusTarget, type TaskValidationError } from '../../common/components/workbench';
    import type { SvelteWorkbenchModel } from '../store/workbench.svelte';

    let { nickname, model }: { nickname: string; model: SvelteWorkbenchModel } = $props();
    let title = $state('');
    let priority = $state('medium');
    let search = $state('');
    let filter = $state<TaskFilter>('all');
    let validationError = $state<TaskValidationError | null>(null);
    let root: HTMLElement;
    let visible = $derived(filterTasks(model.tasks, search, filter));
    let done = $derived(model.tasks.filter(task => task.completed).length);
    let hasCompleted = $derived(model.tasks.some(task => task.completed));
    let resetDisabled = $derived(isInitialTaskCollection(model.tasks, model.nextId) && title === '' && priority === 'medium' && search === '' && filter === 'all' && validationError === null);
    let errorId = $derived(`ft-${nickname}-task-error`);

    async function focusTarget(target: TaskFocusTarget): Promise<void> {
        await tick();
        const selector = target.kind === 'add' ? '[data-ft-role="task-add"]' : `[data-task-id="${target.taskId}"][data-ft-role="task-${target.control}"]`;
        root.querySelector<HTMLElement>(selector)?.focus();
    }
    async function submit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        const error = model.add({ title, priority });
        validationError = error;
        await tick();
        if (error !== null) { document.getElementById(`ft-${nickname}-task-${error.field}`)?.focus(); return; }
        title = ''; priority = 'medium';
        await tick(); document.getElementById(`ft-${nickname}-task-title`)?.focus();
    }
    function updatePriority(event: Event): void { priority = (event.currentTarget as HTMLSelectElement).value; validationError = null; }
    function updateFilter(event: Event): void { const value = (event.currentTarget as HTMLInputElement).value; if (isTaskFilter(value)) filter = value; }
    function toggle(taskId: number): void { const before = visible; model.toggle(taskId); void focusTarget(getTaskFocusTarget(before, filterTasks(model.tasks, search, filter), taskId, 'toggle')); }
    function remove(taskId: number): void { const before = visible; model.remove(taskId); void focusTarget(getTaskFocusTarget(before, filterTasks(model.tasks, search, filter), taskId, 'delete')); }
    async function clearCompleted(): Promise<void> { if (!hasCompleted) return; model.clearCompleted(); await tick(); document.getElementById(`ft-${nickname}-task-title`)?.focus(); }
    async function reset(): Promise<void> { if (resetDisabled) return; model.reset(); title = ''; priority = 'medium'; search = ''; filter = 'all'; validationError = null; await tick(); document.getElementById(`ft-${nickname}-task-title`)?.focus(); }
</script>

<section bind:this={root} class="ft-showcase-task-workbench" data-ft-role="task-workbench">
    <p id={`ft-${nickname}-task-description`} data-ft-role="task-description">{TASK_WORKBENCH_DESCRIPTION}</p>
    <form class="ft-showcase-task-form" data-ft-role="task-form" novalidate onsubmit={submit}>
        <div class="ft-showcase-field" data-ft-role="task-title-field"><label class="ft-showcase-label" for={`ft-${nickname}-task-title`}>Task title</label><input id={`ft-${nickname}-task-title`} class="ft-showcase-input" data-ft-role="task-title" bind:value={title} aria-invalid={validationError?.field === 'title' ? 'true' : undefined} aria-errormessage={validationError?.field === 'title' ? errorId : undefined} oninput={() => validationError = null}><div data-ft-role="task-title-error-slot">{#if validationError?.field === 'title'}<div id={errorId} class="ft-showcase-error" role="alert">{validationError.message}</div>{/if}</div></div>
        <div class="ft-showcase-field" data-ft-role="task-priority-field"><label class="ft-showcase-label" for={`ft-${nickname}-task-priority`}>Priority</label><select id={`ft-${nickname}-task-priority`} class="ft-showcase-select" data-ft-role="task-priority" value={priority} aria-invalid={validationError?.field === 'priority' ? 'true' : undefined} aria-errormessage={validationError?.field === 'priority' ? errorId : undefined} onchange={updatePriority}>{#each TASK_PRIORITIES as option (option.value)}<option value={option.value}>{option.label}</option>{/each}</select><div data-ft-role="task-priority-error-slot">{#if validationError?.field === 'priority'}<div id={errorId} class="ft-showcase-error" role="alert">{validationError.message}</div>{/if}</div></div>
        <button class="ft-showcase-button" data-ft-role="task-add" type="submit">Add task</button>
    </form>
    <div class="ft-showcase-task-filters" data-ft-role="task-filters"><div class="ft-showcase-field" data-ft-role="task-search-field"><label class="ft-showcase-label" for={`ft-${nickname}-task-search`}>Search tasks</label><input id={`ft-${nickname}-task-search`} class="ft-showcase-input" data-ft-role="task-search" value={search} oninput={(event) => search = normalizeTaskSearch(event.currentTarget.value)}></div><fieldset data-ft-role="task-filter"><legend>Task status</legend>{#each TASK_FILTERS as option (option.value)}<label for={`ft-${nickname}-task-status-${option.value}`}><input id={`ft-${nickname}-task-status-${option.value}`} type="radio" name={`ft-${nickname}-task-status`} value={option.value} checked={filter === option.value} onchange={updateFilter}> {option.label}</label>{/each}</fieldset></div>
    <p data-ft-role="task-summary">{model.tasks.length - done} open · {done} done · {model.tasks.length} total</p>
    <progress class="ft-showcase-progress" data-ft-role="task-progress" aria-label="Completed tasks" max={model.tasks.length || 1} value={done} aria-valuetext={`${done} of ${model.tasks.length} tasks complete`}></progress>
    {#if visible.length > 0}<ul class="ft-showcase-task-list" data-ft-role="task-list">{#each visible as task (task.id)}<li class="ft-showcase-task-row" data-ft-role="task-row"><input type="checkbox" data-ft-role="task-toggle" data-task-id={task.id} checked={task.completed} aria-label={`${task.title} completed`} onchange={() => toggle(task.id)}><span class="ft-showcase-task-title">{task.title}</span><span>{TASK_PRIORITIES.find(option => option.value === task.priority)?.label}</span><button class="ft-showcase-button" data-ft-role="task-delete" data-task-id={task.id} type="button" aria-label={`Delete task ${task.id}: ${task.title}`} onclick={() => remove(task.id)}>Delete</button></li>{/each}</ul>{:else}<p data-ft-role="task-empty">No tasks match this view.</p>{/if}
    <div class="ft-showcase-actions" data-ft-role="task-actions"><button class="ft-showcase-button" data-ft-role="task-clear" type="button" disabled={!hasCompleted} onclick={() => void clearCompleted()}>Clear completed</button><button class="ft-showcase-button" data-ft-role="task-reset" type="button" disabled={resetDisabled} onclick={() => void reset()}>Reset sample</button></div>
</section>
