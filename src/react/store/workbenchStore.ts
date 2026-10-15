import { createContext, useContext } from 'react';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
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

export interface WorkbenchState {
    readonly tasks: readonly Task[];
    readonly nextId: number;
    readonly add: (draft: TaskDraft) => TaskValidationError | null;
    readonly toggle: (taskId: number) => void;
    readonly remove: (taskId: number) => void;
    readonly clearCompleted: () => void;
    readonly reset: () => void;
}

export function createWorkbenchStore(): StoreApi<WorkbenchState> {
    const initial = createInitialTaskCollection();
    return createStore<WorkbenchState>((set, get) => ({
        tasks: initial.tasks,
        nextId: initial.nextId,
        add: draft => {
            const state = get();
            const result = addTask({ tasks: state.tasks, nextId: state.nextId }, draft);
            if ('field' in result) return result;
            set({ tasks: result.tasks, nextId: result.nextId });
            return null;
        },
        toggle: taskId => set(state => ({ tasks: toggleTask(state.tasks, taskId) })),
        remove: taskId => set(state => ({ tasks: deleteTask(state.tasks, taskId) })),
        clearCompleted: () => set(state => ({ tasks: clearCompletedTasks(state.tasks) })),
        reset: () => set(createInitialTaskCollection()),
    }));
}

export const WorkbenchStoreContext = createContext<StoreApi<WorkbenchState> | null>(null);

export function useWorkbenchStore<T>(selector: (state: WorkbenchState) => T): T {
    const store = useContext(WorkbenchStoreContext);
    if (store === null) throw new Error('React workbench store is unavailable.');
    return useStore(store, selector);
}
