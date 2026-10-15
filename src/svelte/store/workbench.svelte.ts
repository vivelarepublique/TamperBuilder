import { addTask, clearCompletedTasks, createInitialTaskCollection, deleteTask, toggleTask, type Task, type TaskDraft, type TaskValidationError } from '../../common/components/workbench';

export interface SvelteWorkbenchModel {
    readonly tasks: readonly Task[];
    readonly nextId: number;
    add(draft: TaskDraft): TaskValidationError | null;
    toggle(taskId: number): void;
    remove(taskId: number): void;
    clearCompleted(): void;
    reset(): void;
}

export function createWorkbenchModel(): SvelteWorkbenchModel {
    const initial = createInitialTaskCollection();
    let tasks = $state<readonly Task[]>(initial.tasks);
    let nextId = $state(initial.nextId);
    return {
        get tasks() { return tasks; },
        get nextId() { return nextId; },
        add(draft) {
            const result = addTask({ tasks, nextId }, draft);
            if ('field' in result) return result;
            tasks = result.tasks; nextId = result.nextId;
            return null;
        },
        toggle(taskId) { tasks = toggleTask(tasks, taskId); },
        remove(taskId) { tasks = deleteTask(tasks, taskId); },
        clearCompleted() { tasks = clearCompletedTasks(tasks); },
        reset() { const collection = createInitialTaskCollection(); tasks = collection.tasks; nextId = collection.nextId; },
    };
}
