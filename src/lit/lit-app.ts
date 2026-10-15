import { provide } from '@lit/context';
import { html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import litLogo from '../assets/svg/lit.svg';
import type { RenderLabDependencies } from '../common/components/benchmark';
import { clearCompletedTasks, createInitialTaskCollection, deleteTask, toggleTask } from '../common/components/workbench';
import './components/lit-modal';
import { LitWorkbenchCommandEvent, type LitWorkbenchValue, workbenchContext } from './context/workbench-context';
import { BaseComponent } from './extends/baseComponents';
import type { LitModal } from './components/lit-modal';

@customElement('lit-app')
export class LitApp extends BaseComponent {
    @property() nickname = '';
    @property({ attribute: false }) dependencies!: RenderLabDependencies;
    @provide({ context: workbenchContext }) @state() workbench!: LitWorkbenchValue;
    @state() private expanded = false;
    @query('lit-modal') private modal?: LitModal;

    connectedCallback(): void {
        if (this.workbench === undefined) {
            const initial = createInitialTaskCollection();
            this.workbench = Object.freeze({ tasks: initial.tasks, nextId: initial.nextId, dependencies: this.dependencies });
        }
        super.connectedCallback();
    }

    private updateCollection(tasks: LitWorkbenchValue['tasks'], nextId = this.workbench.nextId): void { this.workbench = Object.freeze({ tasks, nextId, dependencies: this.dependencies }); }
    private handleCommand(event: LitWorkbenchCommandEvent): void {
        const command = event.detail;
        switch (command.type) {
            case 'add': this.updateCollection([...this.workbench.tasks, { id: this.workbench.nextId, title: command.title, priority: command.priority, completed: false }], this.workbench.nextId + 1); break;
            case 'toggle': this.updateCollection(toggleTask(this.workbench.tasks, command.taskId)); break;
            case 'delete': this.updateCollection(deleteTask(this.workbench.tasks, command.taskId)); break;
            case 'clear-completed': this.updateCollection(clearCompletedTasks(this.workbench.tasks)); break;
            case 'reset': { const initial = createInitialTaskCollection(); this.updateCollection(initial.tasks, initial.nextId); break; }
        }
    }

    render() { return html`<button class="ft-showcase-launcher" data-ft-role="launcher" type="button" aria-label="Open Lit component lab" aria-haspopup="dialog" aria-expanded=${this.expanded} @click=${(event: MouseEvent) => { void this.modal?.open(event.currentTarget as HTMLElement); }}><img src=${litLogo} class="ft-showcase-launcher-image framework-test-logo-animation" alt="" aria-hidden="true"><span class="ft-showcase-launcher-label">Open</span></button><lit-modal .nickname=${this.nickname} @expanded-change=${(event: CustomEvent<boolean>) => { this.expanded = event.detail; }} @lit-workbench-command=${this.handleCommand}></lit-modal>`; }
}

declare global { interface HTMLElementTagNameMap { 'lit-app': LitApp; } }
