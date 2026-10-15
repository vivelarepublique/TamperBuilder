import { createMemo, createSignal, For, Show, useContext } from 'solid-js';
import { filterTasks, getTaskFocusTarget, isInitialTaskCollection, isTaskFilter, normalizeTaskSearch, TASK_FILTERS, TASK_PRIORITIES, TASK_WORKBENCH_DESCRIPTION, type TaskFilter, type TaskFocusTarget, type TaskValidationError } from '../../common/components/workbench';
import { WorkbenchContext, type SolidWorkbenchModel } from '../signal/rootModel';

export default function TaskWorkbench(props: { readonly nickname: string }) {
    // Nickname is immutable for the lifetime of this mounted root.
    // eslint-disable-next-line solid/reactivity
    const nickname = props.nickname;
    const context = useContext(WorkbenchContext);
    if (context === undefined) throw new Error('Solid workbench context is unavailable.');
    const model: SolidWorkbenchModel = context;
    const [title, setTitle] = createSignal('');
    const [priority, setPriority] = createSignal('medium');
    const [search, setSearch] = createSignal('');
    const [filter, setFilter] = createSignal<TaskFilter>('all');
    const [validationError, setValidationError] = createSignal<TaskValidationError | null>(null);
    const visible = createMemo(() => filterTasks(model.tasks(), search(), filter()));
    const done = createMemo(() => model.tasks().filter(task => task.completed).length);
    const resetDisabled = createMemo(() => isInitialTaskCollection(model.tasks(), model.nextId()) && title() === '' && priority() === 'medium' && search() === '' && filter() === 'all' && validationError() === null);
    let root!: HTMLElement;
    const errorId = () => `ft-${nickname}-task-error`;

    function focusTarget(target: TaskFocusTarget): void {
        const selector = target.kind === 'add' ? '[data-ft-role="task-add"]' : `[data-task-id="${target.taskId}"][data-ft-role="task-${target.control}"]`;
        queueMicrotask(() => root.querySelector<HTMLElement>(selector)?.focus());
    }
    function submit(event: SubmitEvent): void {
        event.preventDefault();
        const error = model.add({ title: title(), priority: priority() });
        setValidationError(error);
        if (error !== null) { queueMicrotask(() => document.getElementById(`ft-${nickname}-task-${error.field}`)?.focus()); return; }
        setTitle(''); setPriority('medium'); queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus());
    }
    function toggle(taskId: number): void { const before = visible(); model.toggle(taskId); focusTarget(getTaskFocusTarget(before, filterTasks(model.tasks(), search(), filter()), taskId, 'toggle')); }
    function remove(taskId: number): void { const before = visible(); model.remove(taskId); focusTarget(getTaskFocusTarget(before, filterTasks(model.tasks(), search(), filter()), taskId, 'delete')); }
    function clearCompleted(): void { if (!model.hasCompleted()) return; model.clearCompleted(); queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus()); }
    function reset(): void { if (resetDisabled()) return; model.reset(); setTitle(''); setPriority('medium'); setSearch(''); setFilter('all'); setValidationError(null); queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus()); }

    return <section ref={root} class='ft-showcase-task-workbench' data-ft-role='task-workbench'>
        <p id={`ft-${nickname}-task-description`} data-ft-role='task-description'>{TASK_WORKBENCH_DESCRIPTION}</p>
        <form class='ft-showcase-task-form' data-ft-role='task-form' novalidate onSubmit={submit}>
            <div class='ft-showcase-field' data-ft-role='task-title-field'><label class='ft-showcase-label' for={`ft-${nickname}-task-title`}>Task title</label><input id={`ft-${nickname}-task-title`} class='ft-showcase-input' data-ft-role='task-title' value={title()} aria-invalid={validationError()?.field === 'title' ? 'true' : undefined} aria-errormessage={validationError()?.field === 'title' ? errorId() : undefined} onInput={event => { setTitle(event.currentTarget.value); setValidationError(null); }} /><div data-ft-role='task-title-error-slot'><Show when={validationError()?.field === 'title'}><div id={errorId()} class='ft-showcase-error' role='alert'>{validationError()?.message}</div></Show></div></div>
            <div class='ft-showcase-field' data-ft-role='task-priority-field'><label class='ft-showcase-label' for={`ft-${nickname}-task-priority`}>Priority</label><select id={`ft-${nickname}-task-priority`} class='ft-showcase-select' data-ft-role='task-priority' value={priority()} aria-invalid={validationError()?.field === 'priority' ? 'true' : undefined} aria-errormessage={validationError()?.field === 'priority' ? errorId() : undefined} onChange={event => { setPriority(event.currentTarget.value); setValidationError(null); }}><For each={TASK_PRIORITIES}>{option => <option value={option.value}>{option.label}</option>}</For></select><div data-ft-role='task-priority-error-slot'><Show when={validationError()?.field === 'priority'}><div id={errorId()} class='ft-showcase-error' role='alert'>{validationError()?.message}</div></Show></div></div>
            <button class='ft-showcase-button' data-ft-role='task-add' type='submit'>Add task</button>
        </form>
        <div class='ft-showcase-task-filters' data-ft-role='task-filters'><div class='ft-showcase-field' data-ft-role='task-search-field'><label class='ft-showcase-label' for={`ft-${nickname}-task-search`}>Search tasks</label><input id={`ft-${nickname}-task-search`} class='ft-showcase-input' data-ft-role='task-search' value={search()} onInput={event => setSearch(normalizeTaskSearch(event.currentTarget.value))} /></div><fieldset data-ft-role='task-filter'><legend>Task status</legend><For each={TASK_FILTERS}>{option => <label for={`ft-${nickname}-task-status-${option.value}`}><input class='ft-showcase-choice' id={`ft-${nickname}-task-status-${option.value}`} type='radio' name={`ft-${nickname}-task-status`} value={option.value} checked={filter() === option.value} onChange={event => { if (isTaskFilter(event.currentTarget.value)) setFilter(event.currentTarget.value); }} /> {option.label}</label>}</For></fieldset></div>
        <p data-ft-role='task-summary'>{model.tasks().length - done()} open · {done()} done · {model.tasks().length} total</p>
        <progress class='ft-showcase-progress' data-ft-role='task-progress' aria-label='Completed tasks' max={model.tasks().length || 1} value={done()} aria-valuetext={`${done()} of ${model.tasks().length} tasks complete`} />
        <Show when={visible().length > 0} fallback={<p data-ft-role='task-empty'>No tasks match this view.</p>}><ul class='ft-showcase-task-list' data-ft-role='task-list'><For each={visible()}>{task => <li class='ft-showcase-task-row' data-ft-role='task-row'><input class='ft-showcase-choice' type='checkbox' data-ft-role='task-toggle' data-task-id={task.id} checked={task.completed} aria-label={`${task.title} completed`} onChange={() => toggle(task.id)} /><span class='ft-showcase-task-title'>{task.title}</span><span>{TASK_PRIORITIES.find(option => option.value === task.priority)?.label}</span><button class='ft-showcase-button' data-ft-role='task-delete' data-task-id={task.id} type='button' aria-label={`Delete task ${task.id}: ${task.title}`} onClick={() => remove(task.id)}>Delete</button></li>}</For></ul></Show>
        <div class='ft-showcase-actions' data-ft-role='task-actions'><button class='ft-showcase-button' data-ft-role='task-clear' type='button' disabled={!model.hasCompleted()} onClick={clearCompleted}>Clear completed</button><button class='ft-showcase-button' data-ft-role='task-reset' type='button' disabled={resetDisabled()} onClick={reset}>Reset sample</button></div>
    </section>;
}
