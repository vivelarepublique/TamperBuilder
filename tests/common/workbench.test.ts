import { describe, expect, it } from 'vitest';
import {
    addTask,
    clearCompletedTasks,
    createInitialTaskCollection,
    createInitialTasks,
    deleteTask,
    filterTasks,
    getTaskFocusTarget,
    isInitialTaskCollection,
    isTaskFilter,
    isTaskPriority,
    normalizeTaskSearch,
    normalizeTaskTitle,
    toggleTask,
    validateTaskDraft,
} from '../../src/common/components/workbench';

describe('Task workbench pure contracts', () => {
    it('creates independent fixtures and compares every structural field', () => {
        const first = createInitialTasks();
        const second = createInitialTasks();
        expect(first).toEqual(second);
        expect(first).not.toBe(second);
        expect(first[0]).not.toBe(second[0]);
        expect(isInitialTaskCollection(first, 4)).toBe(true);
        expect(isInitialTaskCollection([{ ...first[0], title: 'Changed' }, ...first.slice(1)], 4)).toBe(false);
        expect(isInitialTaskCollection(first, 5)).toBe(false);
        expect(isInitialTaskCollection([first[1], first[0], first[2]], 4)).toBe(false);
    });

    it('normalizes Unicode whitespace and validates in required, length, priority order', () => {
        expect(normalizeTaskTitle('  Review\n\tbuild　output  ')).toBe('Review build output');
        expect(validateTaskDraft({ title: ' '.repeat(61), priority: 'invalid' })).toEqual({
            valid: false,
            error: { field: 'title', message: 'Enter a task title.' },
        });
        expect(validateTaskDraft({ title: `${'a '.repeat(25)}a`, priority: 'high' })).toMatchObject({ valid: true });
        expect(validateTaskDraft({ title: '😀'.repeat(61), priority: 'invalid' })).toEqual({
            valid: false,
            error: { field: 'title', message: 'Use 60 characters or fewer.' },
        });
        expect(validateTaskDraft({ title: 'Valid', priority: 'invalid' })).toEqual({
            valid: false,
            error: { field: 'priority', message: 'Choose a valid priority.' },
        });
        expect(validateTaskDraft({ title: '  Valid   title ', priority: 'low' })).toEqual({ valid: true, title: 'Valid title', priority: 'low' });
    });

    it('truncates search by Unicode code point before trimming and matches title to query', () => {
        expect(normalizeTaskSearch(`${'😀'.repeat(58)} a trailing value`)).toBe(`${'😀'.repeat(58)} a`);
        expect(filterTasks(createInitialTasks(), ' review ', 'all').map(task => task.title)).toEqual(['Review build output']);
        expect(filterTasks(createInitialTasks(), 'REVIEW', 'all').map(task => task.title)).toEqual(['Review build output']);
    });

    it('guards fixed unions', () => {
        expect(isTaskPriority('medium')).toBe(true);
        expect(isTaskPriority('urgent')).toBe(false);
        expect(isTaskFilter('done')).toBe(true);
        expect(isTaskFilter('invalid')).toBe(false);
    });

    it('performs stable CRUD transformations and preserves nextId across removal', () => {
        const initial = createInitialTaskCollection();
        const added = addTask(initial, { title: '  Ship   sample ', priority: 'high' });
        expect('message' in added).toBe(false);
        if ('message' in added) throw new Error('Expected a valid task.');
        expect(added.tasks.at(-1)).toEqual({ id: 4, title: 'Ship sample', priority: 'high', completed: false });
        expect(added.nextId).toBe(5);
        const toggled = toggleTask(added.tasks, 4);
        expect(toggled.map(task => task.id)).toEqual([1, 2, 3, 4]);
        expect(toggled.at(-1)?.completed).toBe(true);
        expect(deleteTask(toggled, 4).map(task => task.id)).toEqual([1, 2, 3]);
        expect(clearCompletedTasks(toggled).map(task => task.id)).toEqual([1, 3]);
        expect(toggleTask(initial.tasks, 0)).toBe(initial.tasks);
        expect(deleteTask(initial.tasks, 99)).toBe(initial.tasks);
        expect(clearCompletedTasks(initial.tasks.filter(task => !task.completed))).toEqual(initial.tasks.filter(task => !task.completed));
    });

    it('filters without reordering and resolves visible-index focus outcomes', () => {
        const tasks = createInitialTasks();
        const open = filterTasks(tasks, '', 'open');
        const afterToggle = filterTasks(toggleTask(tasks, 1), '', 'open');
        expect(open.map(task => task.id)).toEqual([1, 3]);
        expect(getTaskFocusTarget(open, afterToggle, 1, 'toggle')).toEqual({ kind: 'task', taskId: 3, control: 'toggle' });
        expect(getTaskFocusTarget(open, filterTasks(deleteTask(tasks, 3), '', 'open'), 3, 'delete')).toEqual({ kind: 'task', taskId: 1, control: 'delete' });
        expect(getTaskFocusTarget([open[0]], [], 1, 'delete')).toEqual({ kind: 'add' });
        expect(getTaskFocusTarget(tasks, tasks, 2, 'toggle')).toEqual({ kind: 'task', taskId: 2, control: 'toggle' });
    });
});
