export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskFilter = 'all' | 'open' | 'done';

export interface Task {
    readonly id: number;
    readonly title: string;
    readonly priority: TaskPriority;
    readonly completed: boolean;
}

export interface TaskDraft {
    readonly title: string;
    readonly priority: string;
}

export type TaskValidationField = 'title' | 'priority';

export interface TaskValidationError {
    readonly field: TaskValidationField;
    readonly message: 'Enter a task title.' | 'Use 60 characters or fewer.' | 'Choose a valid priority.';
}

export type TaskDraftValidation =
    | { readonly valid: true; readonly title: string; readonly priority: TaskPriority }
    | { readonly valid: false; readonly error: TaskValidationError };

export interface TaskCollection {
    readonly tasks: readonly Task[];
    readonly nextId: number;
}

export type TaskFocusTarget =
    | { readonly kind: 'task'; readonly taskId: number; readonly control: 'toggle' | 'delete' }
    | { readonly kind: 'add' };

export const TASK_WORKBENCH_DESCRIPTION = 'Add, filter, and update a deterministic task list.';
export const TASK_PRIORITIES = Object.freeze([
    Object.freeze({ label: 'Low', value: 'low' as const }),
    Object.freeze({ label: 'Medium', value: 'medium' as const }),
    Object.freeze({ label: 'High', value: 'high' as const }),
]);
export const TASK_FILTERS = Object.freeze([
    Object.freeze({ label: 'All', value: 'all' as const }),
    Object.freeze({ label: 'Open', value: 'open' as const }),
    Object.freeze({ label: 'Done', value: 'done' as const }),
]);

const INITIAL_TASKS: readonly Readonly<Task>[] = Object.freeze([
    Object.freeze({ id: 1, title: 'Review build output', priority: 'high', completed: false }),
    Object.freeze({ id: 2, title: 'Verify userscript metadata', priority: 'medium', completed: true }),
    Object.freeze({ id: 3, title: 'Check narrow layout', priority: 'low', completed: false }),
]);

export function createInitialTasks(): Task[] {
    return INITIAL_TASKS.map(task => ({ ...task }));
}

export function createInitialTaskCollection(): TaskCollection {
    return { tasks: createInitialTasks(), nextId: 4 };
}

export function isInitialTaskCollection(tasks: readonly Task[], nextId: number): boolean {
    return (
        nextId === 4 &&
        tasks.length === INITIAL_TASKS.length &&
        tasks.every((task, index) => {
            const initial = INITIAL_TASKS[index];
            return (
                initial !== undefined &&
                task.id === initial.id &&
                task.title === initial.title &&
                task.priority === initial.priority &&
                task.completed === initial.completed
            );
        })
    );
}

export function isTaskPriority(value: string): value is TaskPriority {
    return value === 'low' || value === 'medium' || value === 'high';
}

export function isTaskFilter(value: string): value is TaskFilter {
    return value === 'all' || value === 'open' || value === 'done';
}

export function isValidTaskId(value: number): boolean {
    return Number.isInteger(value) && value > 0;
}

export function normalizeTaskTitle(title: string): string {
    return title.trim().replace(/\s+/gu, ' ');
}

export function normalizeTaskSearch(rawQuery: string): string {
    return [...rawQuery].slice(0, 60).join('').trim();
}

export function validateTaskDraft(draft: TaskDraft): TaskDraftValidation {
    const title = normalizeTaskTitle(draft.title);
    if ([...title].length === 0) return { valid: false, error: { field: 'title', message: 'Enter a task title.' } };
    if ([...title].length > 60) return { valid: false, error: { field: 'title', message: 'Use 60 characters or fewer.' } };
    if (!isTaskPriority(draft.priority)) return { valid: false, error: { field: 'priority', message: 'Choose a valid priority.' } };
    return { valid: true, title, priority: draft.priority };
}

export function addTask(collection: TaskCollection, draft: TaskDraft): TaskCollection | TaskValidationError {
    const validation = validateTaskDraft(draft);
    if (!validation.valid) return validation.error;
    return {
        tasks: [...collection.tasks, { id: collection.nextId, title: validation.title, priority: validation.priority, completed: false }],
        nextId: collection.nextId + 1,
    };
}

export function toggleTask(tasks: readonly Task[], taskId: number): readonly Task[] {
    if (!isValidTaskId(taskId) || !tasks.some(task => task.id === taskId)) return tasks;
    return tasks.map(task => (task.id === taskId ? { ...task, completed: !task.completed } : task));
}

export function deleteTask(tasks: readonly Task[], taskId: number): readonly Task[] {
    if (!isValidTaskId(taskId) || !tasks.some(task => task.id === taskId)) return tasks;
    return tasks.filter(task => task.id !== taskId);
}

export function clearCompletedTasks(tasks: readonly Task[]): readonly Task[] {
    if (tasks.every(task => !task.completed)) return tasks;
    return tasks.filter(task => !task.completed);
}

export function filterTasks(tasks: readonly Task[], search: string, filter: TaskFilter): readonly Task[] {
    const query = normalizeTaskSearch(search).toLowerCase();
    return tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(query);
        const matchesFilter = filter === 'all' || (filter === 'done' ? task.completed : !task.completed);
        return matchesSearch && matchesFilter;
    });
}

export function getTaskFocusTarget(
    beforeVisibleTasks: readonly Task[],
    afterVisibleTasks: readonly Task[],
    taskId: number,
    control: 'toggle' | 'delete',
): TaskFocusTarget {
    const previousIndex = beforeVisibleTasks.findIndex(task => task.id === taskId);
    if (previousIndex < 0) return { kind: 'add' };
    if (control === 'toggle' && afterVisibleTasks.some(task => task.id === taskId)) return { kind: 'task', taskId, control };
    const candidate = afterVisibleTasks[previousIndex] ?? afterVisibleTasks[previousIndex - 1];
    return candidate === undefined ? { kind: 'add' } : { kind: 'task', taskId: candidate.id, control };
}
