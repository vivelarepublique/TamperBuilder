import { consume } from '@lit/context';
import { html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import {
    filterTasks,
    getTaskFocusTarget,
    isInitialTaskCollection,
    isTaskFilter,
    normalizeTaskSearch,
    TASK_FILTERS,
    TASK_PRIORITIES,
    TASK_WORKBENCH_DESCRIPTION,
    validateTaskDraft,
    type TaskFilter,
    type TaskFocusTarget,
    type TaskValidationError,
} from '../../common/components/workbench';
import { BaseComponent } from '../extends/baseComponents';
import { LitWorkbenchCommandEvent, type LitWorkbenchValue, workbenchContext } from '../context/workbench-context';

@customElement('lit-task-workbench')
export class LitTaskWorkbench extends BaseComponent {
    @property() nickname = '';
    @consume({ context: workbenchContext, subscribe: true }) workbench?: LitWorkbenchValue;
    @state() private draftTitle = '';
    @state() private priority = 'medium';
    @state() private search = '';
    @state() private filter: TaskFilter = 'all';
    @state() private validationError: TaskValidationError | null = null;
    @query('[data-ft-role="task-workbench"]') private section?: HTMLElement;
    private reportedMissingContext = false;

    protected firstUpdated(): void {
        if (this.workbench === undefined && !this.reportedMissingContext) {
            this.reportedMissingContext = true;
            console.error('Lit component state is unavailable.');
        }
    }

    private command(command: LitWorkbenchCommandEvent['detail']): void {
        this.dispatchEvent(new LitWorkbenchCommandEvent(command));
    }

    private async focusControl(target: TaskFocusTarget): Promise<void> {
        await this.updateComplete;
        const selector = target.kind === 'add' ? '[data-ft-role="task-add"]' : `[data-task-id="${target.taskId}"][data-ft-role="task-${target.control}"]`;
        this.section?.querySelector<HTMLElement>(selector)?.focus();
    }

    private async submit(event: SubmitEvent): Promise<void> {
        event.preventDefault();
        const validation = validateTaskDraft({ title: this.draftTitle, priority: this.priority });
        if (!validation.valid) {
            this.validationError = validation.error;
            await this.updateComplete;
            this.querySelector<HTMLElement>(`#ft-${this.nickname}-task-${validation.error.field}`)?.focus();
            return;
        }
        this.command({ type: 'add', title: validation.title, priority: validation.priority });
        this.draftTitle = '';
        this.priority = 'medium';
        this.validationError = null;
        await this.updateComplete;
        this.querySelector<HTMLElement>(`#ft-${this.nickname}-task-title`)?.focus();
    }

    private toggle(taskId: number): void {
        if (this.workbench === undefined) return;
        const before = filterTasks(this.workbench.tasks, this.search, this.filter);
        const afterTasks = this.workbench.tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task);
        this.command({ type: 'toggle', taskId });
        void this.focusControl(getTaskFocusTarget(before, filterTasks(afterTasks, this.search, this.filter), taskId, 'toggle'));
    }

    private deleteItem(taskId: number): void {
        if (this.workbench === undefined) return;
        const before = filterTasks(this.workbench.tasks, this.search, this.filter);
        const after = filterTasks(this.workbench.tasks.filter(task => task.id !== taskId), this.search, this.filter);
        this.command({ type: 'delete', taskId });
        void this.focusControl(getTaskFocusTarget(before, after, taskId, 'delete'));
    }

    private async clearCompleted(): Promise<void> {
        if (this.workbench?.tasks.every(task => !task.completed) !== false) return;
        this.command({ type: 'clear-completed' });
        await this.updateComplete;
        this.querySelector<HTMLElement>(`#ft-${this.nickname}-task-title`)?.focus();
    }

    private async reset(): Promise<void> {
        if (this.workbench === undefined || this.resetDisabled) return;
        this.command({ type: 'reset' });
        this.draftTitle = ''; this.priority = 'medium'; this.search = ''; this.filter = 'all'; this.validationError = null;
        await this.updateComplete;
        this.querySelector<HTMLElement>(`#ft-${this.nickname}-task-title`)?.focus();
    }

    private get resetDisabled(): boolean {
        return this.workbench !== undefined && isInitialTaskCollection(this.workbench.tasks, this.workbench.nextId) && this.draftTitle === '' && this.priority === 'medium' && this.search === '' && this.filter === 'all' && this.validationError === null;
    }

    render() {
        if (this.workbench === undefined) return html`<div class="ft-showcase-error" role="alert">Component state is unavailable.</div>`;
        const tasks = this.workbench.tasks;
        const visible = filterTasks(tasks, this.search, this.filter);
        const done = tasks.filter(task => task.completed).length;
        const errorId = `ft-${this.nickname}-task-error`;
        return html`<section class="ft-showcase-task-workbench" data-ft-role="task-workbench">
            <p id=${`ft-${this.nickname}-task-description`} data-ft-role="task-description">${TASK_WORKBENCH_DESCRIPTION}</p>
            <form class="ft-showcase-task-form" data-ft-role="task-form" novalidate @submit=${this.submit}>
                <div class="ft-showcase-field" data-ft-role="task-title-field"><label class="ft-showcase-label" for=${`ft-${this.nickname}-task-title`}>Task title</label><input id=${`ft-${this.nickname}-task-title`} class="ft-showcase-input" data-ft-role="task-title" .value=${this.draftTitle} aria-invalid=${this.validationError?.field === 'title' ? 'true' : nothing} aria-errormessage=${this.validationError?.field === 'title' ? errorId : nothing} @input=${(event: InputEvent) => { this.draftTitle = (event.currentTarget as HTMLInputElement).value; this.validationError = null; }}><div data-ft-role="task-title-error-slot">${this.validationError?.field === 'title' ? html`<div id=${errorId} class="ft-showcase-error" role="alert">${this.validationError.message}</div>` : nothing}</div></div>
                <div class="ft-showcase-field" data-ft-role="task-priority-field"><label class="ft-showcase-label" for=${`ft-${this.nickname}-task-priority`}>Priority</label><select id=${`ft-${this.nickname}-task-priority`} class="ft-showcase-select" data-ft-role="task-priority" .value=${this.priority} aria-invalid=${this.validationError?.field === 'priority' ? 'true' : nothing} aria-errormessage=${this.validationError?.field === 'priority' ? errorId : nothing} @change=${(event: Event) => { this.priority = (event.currentTarget as HTMLSelectElement).value; this.validationError = null; }}>${TASK_PRIORITIES.map(option => html`<option value=${option.value}>${option.label}</option>`)}</select><div data-ft-role="task-priority-error-slot">${this.validationError?.field === 'priority' ? html`<div id=${errorId} class="ft-showcase-error" role="alert">${this.validationError.message}</div>` : nothing}</div></div>
                <button class="ft-showcase-button" data-ft-role="task-add" type="submit">Add task</button>
            </form>
            <div class="ft-showcase-task-filters" data-ft-role="task-filters"><div class="ft-showcase-field" data-ft-role="task-search-field"><label class="ft-showcase-label" for=${`ft-${this.nickname}-task-search`}>Search tasks</label><input id=${`ft-${this.nickname}-task-search`} class="ft-showcase-input" data-ft-role="task-search" .value=${this.search} @input=${(event: InputEvent) => { this.search = normalizeTaskSearch((event.currentTarget as HTMLInputElement).value); }}></div><fieldset data-ft-role="task-filter"><legend>Task status</legend>${TASK_FILTERS.map(option => html`<label for=${`ft-${this.nickname}-task-status-${option.value}`}><input id=${`ft-${this.nickname}-task-status-${option.value}`} type="radio" name=${`ft-${this.nickname}-task-status`} value=${option.value} .checked=${this.filter === option.value} @change=${(event: Event) => { const value = (event.currentTarget as HTMLInputElement).value; if (isTaskFilter(value)) this.filter = value; }}> ${option.label}</label>`)}</fieldset></div>
            <p data-ft-role="task-summary">${tasks.length - done} open · ${done} done · ${tasks.length} total</p>
            <progress class="ft-showcase-progress" data-ft-role="task-progress" aria-label="Completed tasks" max=${tasks.length || 1} value=${done} aria-valuetext=${`${done} of ${tasks.length} tasks complete`}></progress>
            ${visible.length > 0 ? html`<ul class="ft-showcase-task-list" data-ft-role="task-list">${repeat(visible, task => task.id, task => html`<li class="ft-showcase-task-row" data-ft-role="task-row"><input type="checkbox" data-ft-role="task-toggle" data-task-id=${task.id} .checked=${task.completed} aria-label=${`${task.title} completed`} @change=${() => this.toggle(task.id)}><span class="ft-showcase-task-title">${task.title}</span><span>${TASK_PRIORITIES.find(option => option.value === task.priority)?.label}</span><button class="ft-showcase-button" data-ft-role="task-delete" data-task-id=${task.id} type="button" aria-label=${`Delete task ${task.id}: ${task.title}`} @click=${() => this.deleteItem(task.id)}>Delete</button></li>`)}</ul>` : html`<p data-ft-role="task-empty">No tasks match this view.</p>`}
            <div class="ft-showcase-actions" data-ft-role="task-actions"><button class="ft-showcase-button" data-ft-role="task-clear" type="button" ?disabled=${tasks.every(task => !task.completed)} @click=${this.clearCompleted}>Clear completed</button><button class="ft-showcase-button" data-ft-role="task-reset" type="button" ?disabled=${this.resetDisabled} @click=${this.reset}>Reset sample</button></div>
        </section>`;
    }
}

declare global { interface HTMLElementTagNameMap { 'lit-task-workbench': LitTaskWorkbench; } }
