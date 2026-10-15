import { createContext, createMemo, createSignal, type Accessor } from 'solid-js';
import { addTask, clearCompletedTasks, createInitialTaskCollection, deleteTask, toggleTask, type Task, type TaskDraft, type TaskValidationError } from '../../common/components/workbench';

export interface SolidWorkbenchModel {
    readonly tasks: Accessor<readonly Task[]>;
    readonly nextId: Accessor<number>;
    readonly hasCompleted: Accessor<boolean>;
    add(draft: TaskDraft): TaskValidationError | null;
    toggle(taskId: number): void;
    remove(taskId: number): void;
    clearCompleted(): void;
    reset(): void;
}

export function createWorkbenchModel(): SolidWorkbenchModel {
    const initial = createInitialTaskCollection();
    const [tasks, setTasks] = createSignal<readonly Task[]>(initial.tasks);
    const [nextId, setNextId] = createSignal(initial.nextId);
    const hasCompleted = createMemo(() => tasks().some(task => task.completed));
    return {
        tasks, nextId, hasCompleted,
        add(draft) {
            const result = addTask({ tasks: tasks(), nextId: nextId() }, draft);
            if ('field' in result) return result;
            setTasks(result.tasks); setNextId(result.nextId); return null;
        },
        toggle(taskId) { setTasks(current => toggleTask(current, taskId)); },
        remove(taskId) { setTasks(current => deleteTask(current, taskId)); },
        clearCompleted() { setTasks(current => clearCompletedTasks(current)); },
        reset() { const collection = createInitialTaskCollection(); setTasks(collection.tasks); setNextId(collection.nextId); },
    };
}

export const WorkbenchContext = createContext<SolidWorkbenchModel>();
