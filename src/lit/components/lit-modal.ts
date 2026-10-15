import { html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { handleDialogTab, keepFocusInsideDialog, restoreDialogOpener } from '../../common/components/dialog';
import { BaseComponent } from '../extends/baseComponents';
import './lit-task-workbench';
import './lit-render-lab';

@customElement('lit-modal')
export class LitModal extends BaseComponent {
    @property() nickname = '';
    @state() private activeTab: 'task' | 'render' = 'task';
    @state() private opened = false;
    @query('dialog') private dialog?: HTMLDialogElement;
    private opener: HTMLElement | null = null;

    private readonly focusGuard = (event: FocusEvent) => { if (this.dialog !== undefined) keepFocusInsideDialog(event, this.dialog); };
    async open(source: HTMLElement): Promise<void> { this.opener = source; this.activeTab = 'task'; this.opened = true; await this.updateComplete; this.dialog?.showModal(); document.addEventListener('focusin', this.focusGuard, true); this.dispatchEvent(new CustomEvent('expanded-change', { detail: true })); await this.updateComplete; this.querySelector<HTMLElement>(`#ft-${this.nickname}-tab-task`)?.focus(); }
    private cancelRenderRun(): void { this.querySelector('lit-render-lab')?.dispatchEvent(new Event('cancel-active-run')); }
    close(restoreFocus = true): void { const source = this.opener; this.cancelRenderRun(); this.opened = false; this.activeTab = 'task'; document.removeEventListener('focusin', this.focusGuard, true); if (this.dialog?.open) this.dialog.close(); this.dispatchEvent(new CustomEvent('expanded-change', { detail: false })); this.opener = null; if (restoreFocus) restoreDialogOpener(source); }
    disconnectedCallback(): void { this.close(false); super.disconnectedCallback(); }
    private selectTab(tab: 'task' | 'render', focus = true): void { if (this.activeTab === 'render' && tab !== 'render') this.cancelRenderRun(); this.activeTab = tab; if (focus) void this.updateComplete.then(() => this.querySelector<HTMLElement>(`#ft-${this.nickname}-tab-${tab}`)?.focus()); }
    private tabKey(event: KeyboardEvent): void { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); this.selectTab(this.activeTab === 'task' ? 'render' : 'task'); } else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); this.selectTab(event.key === 'Home' ? 'task' : 'render'); } }

    render() { return html`<dialog class="ft-showcase-dialog" aria-labelledby=${`ft-${this.nickname}-dialog-title`} tabindex="-1" data-ft-role="dialog" @cancel=${(event: Event) => { event.preventDefault(); this.close(); }} @click=${(event: MouseEvent) => { if (event.target === event.currentTarget) this.close(); }} @keydown=${(event: KeyboardEvent) => { if (this.dialog !== undefined) handleDialogTab(event, this.dialog); }}>
        <div class="ft-showcase-header"><h2 id=${`ft-${this.nickname}-dialog-title`}>Component lab</h2><button class="ft-showcase-button" type="button" aria-label="Close component lab" @click=${() => this.close()}>Close</button></div>
        <div class="ft-showcase-tabs" role="tablist" tabindex="-1" aria-label="Component lab sections" @keydown=${this.tabKey}><button id=${`ft-${this.nickname}-tab-task`} class="ft-showcase-tab" data-ft-role="tab-task" role="tab" type="button" aria-selected=${this.activeTab === 'task'} aria-controls=${`ft-${this.nickname}-panel-task`} tabindex=${this.activeTab === 'task' ? 0 : -1} @click=${() => this.selectTab('task', false)}>Task</button><button id=${`ft-${this.nickname}-tab-render`} class="ft-showcase-tab" data-ft-role="tab-render" role="tab" type="button" aria-selected=${this.activeTab === 'render'} aria-controls=${`ft-${this.nickname}-panel-render`} tabindex=${this.activeTab === 'render' ? 0 : -1} @click=${() => this.selectTab('render', false)}>Render</button></div>
        ${!this.opened ? nothing : this.activeTab === 'task' ? html`<div id=${`ft-${this.nickname}-panel-task`} role="tabpanel" aria-labelledby=${`ft-${this.nickname}-tab-task`} aria-describedby=${`ft-${this.nickname}-task-description`}><lit-task-workbench .nickname=${this.nickname}></lit-task-workbench></div>` : html`<div id=${`ft-${this.nickname}-panel-render`} role="tabpanel" aria-labelledby=${`ft-${this.nickname}-tab-render`} aria-describedby=${`ft-${this.nickname}-render-description`}><lit-render-lab .nickname=${this.nickname}></lit-render-lab></div>`}
    </dialog>`; }
}

declare global { interface HTMLElementTagNameMap { 'lit-modal': LitModal; } }
