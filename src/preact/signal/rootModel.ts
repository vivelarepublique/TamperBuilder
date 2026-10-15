import { batch, computed, signal, type ReadonlySignal, type Signal } from '@preact/signals';
import {
    addTask,
    clearCompletedTasks,
    createInitialTaskCollection,
    deleteTask,
    toggleTask,
    type Task,
    type TaskDraft,
    type TaskValidationError,
} from '../../common/components/workbench';

export interface PreactModel {
    readonly open: Signal<boolean>;
    openLab(): void;
    closeLab(): void;
    readonly tasks: Signal<readonly Task[]>;
    readonly nextId: Signal<number>;
    readonly hasCompleted: ReadonlySignal<boolean>;
    add(draft: TaskDraft): TaskValidationError | null;
    toggle(taskId: number): void;
    remove(taskId: number): void;
    clearCompleted(): void;
    reset(): void;
}

export function createPreactModel(): PreactModel {
    const initial = createInitialTaskCollection();
    const open = signal(false);
    const tasks = signal<readonly Task[]>(initial.tasks);
    const nextId = signal(initial.nextId);
    const hasCompleted = computed(() => tasks.value.some(task => task.completed));
    return {
        open,
        openLab() { open.value = true; },
        closeLab() { open.value = false; },
        tasks,
        nextId,
        hasCompleted,
        add(draft) {
            const result = addTask({ tasks: tasks.value, nextId: nextId.value }, draft);
            if ('field' in result) return result;
            batch(() => {
                tasks.value = result.tasks;
                nextId.value = result.nextId;
            });
            return null;
        },
        toggle(taskId) { tasks.value = toggleTask(tasks.value, taskId); },
        remove(taskId) { tasks.value = deleteTask(tasks.value, taskId); },
        clearCompleted() { tasks.value = clearCompletedTasks(tasks.value); },
        reset() {
            const collection = createInitialTaskCollection();
            batch(() => {
                tasks.value = collection.tasks;
                nextId.value = collection.nextId;
            });
        },
    };
}
