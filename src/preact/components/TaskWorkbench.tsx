import { useMemo, useRef, useState } from 'preact/hooks';
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
import type { PreactModel } from '../signal/rootModel';

export default function TaskWorkbench({ nickname, model }: { readonly nickname: string; readonly model: PreactModel }) {
    const tasks = model.tasks.value;
    const nextId = model.nextId.value;
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<TaskFilter>('all');
    const [validationError, setValidationError] = useState<TaskValidationError | null>(null);
    const rootRef = useRef<HTMLElement>(null);
    const visibleTasks = useMemo(() => filterTasks(tasks, search, filter), [tasks, search, filter]);
    const done = useMemo(() => tasks.filter(task => task.completed).length, [tasks]);
    const resetDisabled = isInitialTaskCollection(tasks, nextId) && title === '' && priority === 'medium' && search === '' && filter === 'all' && validationError === null;
    const errorId = `ft-${nickname}-task-error`;

    function focusTarget(target: TaskFocusTarget): void {
        const selector = target.kind === 'add' ? '[data-ft-role="task-add"]' : `[data-task-id="${target.taskId}"][data-ft-role="task-${target.control}"]`;
        queueMicrotask(() => rootRef.current?.querySelector<HTMLElement>(selector)?.focus());
    }

    function submit(event: SubmitEvent): void {
        event.preventDefault();
        const error = model.add({ title, priority });
        setValidationError(error);
        if (error !== null) {
            queueMicrotask(() => document.getElementById(`ft-${nickname}-task-${error.field}`)?.focus());
            return;
        }
        setTitle('');
        setPriority('medium');
        queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus());
    }

    function toggle(taskId: number): void {
        const before = visibleTasks;
        model.toggle(taskId);
        focusTarget(getTaskFocusTarget(before, filterTasks(model.tasks.value, search, filter), taskId, 'toggle'));
    }

    function remove(taskId: number): void {
        const before = visibleTasks;
        model.remove(taskId);
        focusTarget(getTaskFocusTarget(before, filterTasks(model.tasks.value, search, filter), taskId, 'delete'));
    }

    function reset(): void {
        if (resetDisabled) return;
        model.reset();
        setTitle(''); setPriority('medium'); setSearch(''); setFilter('all'); setValidationError(null);
        queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus());
    }

    return (
        <section ref={rootRef} class='ft-showcase-task-workbench' data-ft-role='task-workbench'>
            <p id={`ft-${nickname}-task-description`} data-ft-role='task-description'>{TASK_WORKBENCH_DESCRIPTION}</p>
            <form class='ft-showcase-task-form' data-ft-role='task-form' noValidate onSubmit={submit}>
                <div class='ft-showcase-field' data-ft-role='task-title-field'>
                    <label class='ft-showcase-label' htmlFor={`ft-${nickname}-task-title`}>Task title</label>
                    <input id={`ft-${nickname}-task-title`} class='ft-showcase-input' data-ft-role='task-title' value={title} aria-invalid={validationError?.field === 'title' ? true : undefined} aria-errormessage={validationError?.field === 'title' ? errorId : undefined} onInput={event => { setTitle(event.currentTarget.value); setValidationError(null); }} />
                    <div data-ft-role='task-title-error-slot'>{validationError?.field === 'title' && <div id={errorId} class='ft-showcase-error' role='alert'>{validationError.message}</div>}</div>
                </div>
                <div class='ft-showcase-field' data-ft-role='task-priority-field'>
                    <label class='ft-showcase-label' htmlFor={`ft-${nickname}-task-priority`}>Priority</label>
                    <select id={`ft-${nickname}-task-priority`} class='ft-showcase-select' data-ft-role='task-priority' value={priority} aria-invalid={validationError?.field === 'priority' ? true : undefined} aria-errormessage={validationError?.field === 'priority' ? errorId : undefined} onChange={event => { setPriority(event.currentTarget.value); setValidationError(null); }}>
                        {TASK_PRIORITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <div data-ft-role='task-priority-error-slot'>{validationError?.field === 'priority' && <div id={errorId} class='ft-showcase-error' role='alert'>{validationError.message}</div>}</div>
                </div>
                <button class='ft-showcase-button' data-ft-role='task-add' type='submit'>Add task</button>
            </form>
            <div class='ft-showcase-task-filters' data-ft-role='task-filters'>
                <div class='ft-showcase-field' data-ft-role='task-search-field'>
                    <label class='ft-showcase-label' htmlFor={`ft-${nickname}-task-search`}>Search tasks</label>
                    <input id={`ft-${nickname}-task-search`} class='ft-showcase-input' data-ft-role='task-search' value={search} onInput={event => setSearch(normalizeTaskSearch(event.currentTarget.value))} />
                </div>
                <fieldset data-ft-role='task-filter'>
                    <legend>Task status</legend>
                    {TASK_FILTERS.map(option => <label key={option.value} htmlFor={`ft-${nickname}-task-status-${option.value}`}><input id={`ft-${nickname}-task-status-${option.value}`} type='radio' name={`ft-${nickname}-task-status`} value={option.value} checked={filter === option.value} onChange={event => { if (isTaskFilter(event.currentTarget.value)) setFilter(event.currentTarget.value); }} /> {option.label}</label>)}
                </fieldset>
            </div>
            <p data-ft-role='task-summary'>{tasks.length - done} open · {done} done · {tasks.length} total</p>
            <progress class='ft-showcase-progress' data-ft-role='task-progress' aria-label='Completed tasks' max={tasks.length || 1} value={done} aria-valuetext={`${done} of ${tasks.length} tasks complete`} />
            {visibleTasks.length > 0 ? <ul class='ft-showcase-task-list' data-ft-role='task-list'>
                {visibleTasks.map(task => <li key={task.id} class='ft-showcase-task-row' data-ft-role='task-row'>
                    <input type='checkbox' data-ft-role='task-toggle' data-task-id={task.id} checked={task.completed} aria-label={`${task.title} completed`} onChange={() => toggle(task.id)} />
                    <span class='ft-showcase-task-title'>{task.title}</span><span>{TASK_PRIORITIES.find(option => option.value === task.priority)?.label}</span>
                    <button class='ft-showcase-button' data-ft-role='task-delete' data-task-id={task.id} type='button' aria-label={`Delete task ${task.id}: ${task.title}`} onClick={() => remove(task.id)}>Delete</button>
                </li>)}
            </ul> : <p data-ft-role='task-empty'>No tasks match this view.</p>}
            <div class='ft-showcase-actions' data-ft-role='task-actions'>
                <button class='ft-showcase-button' data-ft-role='task-clear' type='button' disabled={!model.hasCompleted.value} onClick={() => { if (model.hasCompleted.value) { model.clearCompleted(); queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus()); } }}>Clear completed</button>
                <button class='ft-showcase-button' data-ft-role='task-reset' type='button' disabled={resetDisabled} onClick={reset}>Reset sample</button>
            </div>
        </section>
    );
}
