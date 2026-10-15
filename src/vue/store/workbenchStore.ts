import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
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

export const useWorkbenchStore = defineStore('component-lab-workbench', () => {
    const initial = createInitialTaskCollection();
    const tasks = ref<readonly Task[]>(initial.tasks);
    const nextId = ref(initial.nextId);
    const hasCompleted = computed(() => tasks.value.some(task => task.completed));

    function add(draft: TaskDraft): TaskValidationError | null {
        const result = addTask({ tasks: tasks.value, nextId: nextId.value }, draft);
        if ('field' in result) return result;
        tasks.value = result.tasks;
        nextId.value = result.nextId;
        return null;
    }

    function toggle(taskId: number): void {
        tasks.value = toggleTask(tasks.value, taskId);
    }

    function remove(taskId: number): void {
        tasks.value = deleteTask(tasks.value, taskId);
    }

    function clearCompleted(): void {
        tasks.value = clearCompletedTasks(tasks.value);
    }

    function reset(): void {
        const collection = createInitialTaskCollection();
        tasks.value = collection.tasks;
        nextId.value = collection.nextId;
    }

    return { tasks, nextId, hasCompleted, add, toggle, remove, clearCompleted, reset };
});
