import { useCallback, useMemo, useRef, useState } from 'react';
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

export default function TaskWorkbench({ nickname }: { readonly nickname: string }) {
    const tasks = useWorkbenchStore(state => state.tasks);
    const nextId = useWorkbenchStore(state => state.nextId);
    const add = useWorkbenchStore(state => state.add);
    const toggleTask = useWorkbenchStore(state => state.toggle);
    const deleteTask = useWorkbenchStore(state => state.remove);
    const clearCompletedTasks = useWorkbenchStore(state => state.clearCompleted);
    const resetTasks = useWorkbenchStore(state => state.reset);
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<TaskFilter>('all');
    const [validationError, setValidationError] = useState<TaskValidationError | null>(null);
    const rootRef = useRef<HTMLElement>(null);
    const visibleTasks = useMemo(() => filterTasks(tasks, search, filter), [tasks, search, filter]);
    const done = useMemo(() => tasks.filter(task => task.completed).length, [tasks]);
    const open = tasks.length - done;
    const hasCompleted = tasks.some(task => task.completed);
    const resetDisabled =
        isInitialTaskCollection(tasks, nextId) && title === '' && priority === 'medium' && search === '' && filter === 'all' && validationError === null;
    const errorId = `ft-${nickname}-task-error`;

    const focusTarget = useCallback((target: TaskFocusTarget) => {
        const selector =
            target.kind === 'add'
                ? '[data-ft-role="task-add"]'
                : `[data-task-id="${target.taskId}"][data-ft-role="task-${target.control}"]`;
        queueMicrotask(() => rootRef.current?.querySelector<HTMLElement>(selector)?.focus());
    }, []);

    function submit(event: React.FormEvent): void {
        event.preventDefault();
        const error = add({ title, priority });
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
        toggleTask(taskId);
        const after = filterTasks(tasks.map(task => (task.id === taskId ? { ...task, completed: !task.completed } : task)), search, filter);
        focusTarget(getTaskFocusTarget(before, after, taskId, 'toggle'));
    }

    function remove(taskId: number): void {
        const before = visibleTasks;
        const after = filterTasks(tasks.filter(task => task.id !== taskId), search, filter);
        deleteTask(taskId);
        focusTarget(getTaskFocusTarget(before, after, taskId, 'delete'));
    }

    function clearCompleted(): void {
        if (!hasCompleted) return;
        clearCompletedTasks();
        queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus());
    }

    function reset(): void {
        if (resetDisabled) return;
        resetTasks();
        setTitle('');
        setPriority('medium');
        setSearch('');
        setFilter('all');
        setValidationError(null);
        queueMicrotask(() => document.getElementById(`ft-${nickname}-task-title`)?.focus());
    }

    return (
        <section ref={rootRef} className='ft-showcase-task-workbench' data-ft-role='task-workbench'>
            <p id={`ft-${nickname}-task-description`} data-ft-role='task-description'>{TASK_WORKBENCH_DESCRIPTION}</p>
            <form className='ft-showcase-task-form' data-ft-role='task-form' noValidate onSubmit={submit}>
                <div className='ft-showcase-field' data-ft-role='task-title-field'>
                    <label className='ft-showcase-label' htmlFor={`ft-${nickname}-task-title`}>Task title</label>
                    <input
                        id={`ft-${nickname}-task-title`}
                        className='ft-showcase-input'
                        data-ft-role='task-title'
                        value={title}
                        aria-invalid={validationError?.field === 'title' ? true : undefined}
                        aria-errormessage={validationError?.field === 'title' ? errorId : undefined}
                        onChange={event => { setTitle(event.currentTarget.value); setValidationError(null); }}
                    />
                    <div data-ft-role='task-title-error-slot'>
                        {validationError?.field === 'title' && <div id={errorId} className='ft-showcase-error' role='alert'>{validationError.message}</div>}
                    </div>
                </div>
                <div className='ft-showcase-field' data-ft-role='task-priority-field'>
                    <label className='ft-showcase-label' htmlFor={`ft-${nickname}-task-priority`}>Priority</label>
                    <select
                        id={`ft-${nickname}-task-priority`}
                        className='ft-showcase-select'
                        data-ft-role='task-priority'
                        value={priority}
                        aria-invalid={validationError?.field === 'priority' ? true : undefined}
                        aria-errormessage={validationError?.field === 'priority' ? errorId : undefined}
                        onChange={event => { setPriority(event.currentTarget.value); setValidationError(null); }}
                    >
                        {TASK_PRIORITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <div data-ft-role='task-priority-error-slot'>
                        {validationError?.field === 'priority' && <div id={errorId} className='ft-showcase-error' role='alert'>{validationError.message}</div>}
                    </div>
                </div>
                <button className='ft-showcase-button' data-ft-role='task-add' type='submit'>Add task</button>
            </form>
            <div className='ft-showcase-task-filters' data-ft-role='task-filters'>
                <div className='ft-showcase-field' data-ft-role='task-search-field'>
                    <label className='ft-showcase-label' htmlFor={`ft-${nickname}-task-search`}>Search tasks</label>
                    <input id={`ft-${nickname}-task-search`} className='ft-showcase-input' data-ft-role='task-search' value={search} onChange={event => setSearch(normalizeTaskSearch(event.currentTarget.value))} />
                </div>
                <fieldset data-ft-role='task-filter'>
                    <legend>Task status</legend>
                    {TASK_FILTERS.map(option => (
                        <label key={option.value} htmlFor={`ft-${nickname}-task-status-${option.value}`}>
                            <input
                                id={`ft-${nickname}-task-status-${option.value}`}
                                type='radio'
                                name={`ft-${nickname}-task-status`}
                                value={option.value}
                                checked={filter === option.value}
                                onChange={event => { if (isTaskFilter(event.currentTarget.value)) setFilter(event.currentTarget.value); }}
                            /> {option.label}
                        </label>
                    ))}
                </fieldset>
            </div>
            <p data-ft-role='task-summary'>{open} open · {done} done · {tasks.length} total</p>
            <progress className='ft-showcase-progress' data-ft-role='task-progress' aria-label='Completed tasks' max={tasks.length || 1} value={done} aria-valuetext={`${done} of ${tasks.length} tasks complete`} />
            {visibleTasks.length > 0 ? (
                <ul className='ft-showcase-task-list' data-ft-role='task-list'>
                    {visibleTasks.map(task => (
                        <li key={task.id} className='ft-showcase-task-row' data-ft-role='task-row'>
                            <input type='checkbox' data-ft-role='task-toggle' data-task-id={task.id} checked={task.completed} aria-label={`${task.title} completed`} onChange={() => toggle(task.id)} />
                            <span className='ft-showcase-task-title'>{task.title}</span>
                            <span>{TASK_PRIORITIES.find(option => option.value === task.priority)?.label}</span>
                            <button className='ft-showcase-button' data-ft-role='task-delete' data-task-id={task.id} type='button' aria-label={`Delete task ${task.id}: ${task.title}`} onClick={() => remove(task.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            ) : <p data-ft-role='task-empty'>No tasks match this view.</p>}
            <div className='ft-showcase-actions' data-ft-role='task-actions'>
                <button className='ft-showcase-button' data-ft-role='task-clear' type='button' disabled={!hasCompleted} onClick={clearCompleted}>Clear completed</button>
                <button className='ft-showcase-button' data-ft-role='task-reset' type='button' disabled={resetDisabled} onClick={reset}>Reset sample</button>
            </div>
        </section>
    );
}
