import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import type { RenderLabDependencies } from '../../common/components/benchmark';
import {
    COMPONENT_LAB_TABS,
    createPanelLifecycleRegistration,
    focusAndScrollComponentLabTab,
    getComponentLabTabForKey,
    handleDialogTab,
    keepFocusInsideDialog,
    restoreDialogOpener,
    type ComponentLabTabKey,
    type PanelLifecycleHandle,
    type PanelLifecycleRegistration,
} from '../../common/components/dialog';
import type { LifecycleLabDependencies } from '../../common/components/lifecycle';
import type { PageBridgeEnvironment } from '../../common/components/pageBridge';
import { BaseComponent } from '../extends/baseComponents';
import './lit-composition-lab';
import './lit-lifecycle-lab';
import './lit-page-bridge-lab';
import './lit-render-lab';
import './lit-task-workbench';

@customElement('lit-modal')
export class LitModal extends BaseComponent {
    @property() nickname = '';
    @property({ attribute: false }) dependencies!: RenderLabDependencies;
    @property({ attribute: false }) pageBridgeEnvironment!: PageBridgeEnvironment;
    @property({ attribute: false }) lifecycleDependencies!: LifecycleLabDependencies;
    @property({ attribute: false }) registerRootLifecycle!: PanelLifecycleRegistration['register'];
    @state() private activeTab: ComponentLabTabKey = 'task';
    @state() private opened = false;
    @query('dialog') private dialog?: HTMLDialogElement;
    private readonly panelRegistration = createPanelLifecycleRegistration();
    private unregisterPanel: (() => void) | null = null;
    private unregisterRoot: (() => void) | null = null;
    private opener: HTMLElement | null = null;

    private readonly focusGuard = (event: FocusEvent) => { if (this.dialog !== undefined) keepFocusInsideDialog(event, this.dialog); };

    connectedCallback(): void {
        super.connectedCallback();
        this.unregisterRoot = this.registerRootLifecycle({ deactivate: this.panelRegistration.deactivateActivePanel });
    }

    async open(source: HTMLElement): Promise<void> {
        this.opener = source;
        this.activeTab = 'task';
        this.opened = true;
        await this.updateComplete;
        this.dialog?.showModal();
        document.addEventListener('focusin', this.focusGuard, true);
        this.dispatchEvent(new CustomEvent('expanded-change', { detail: true }));
        await this.updateComplete;
        this.querySelector<HTMLElement>(`#ft-${this.nickname}-tab-task`)?.focus();
    }

    deactivate(): void {
        this.panelRegistration.deactivateActivePanel();
    }

    close(restoreFocus = true): void {
        const source = this.opener;
        this.deactivate();
        this.opened = false;
        this.activeTab = 'task';
        document.removeEventListener('focusin', this.focusGuard, true);
        if (this.dialog?.open) this.dialog.close();
        this.dispatchEvent(new CustomEvent('expanded-change', { detail: false }));
        this.opener = null;
        if (restoreFocus) restoreDialogOpener(source);
    }

    disconnectedCallback(): void {
        this.close(false);
        this.unregisterPanel?.();
        this.unregisterRoot?.();
        this.unregisterPanel = null;
        this.unregisterRoot = null;
        super.disconnectedCallback();
    }

    protected updated(changed: PropertyValues): void {
        if (!changed.has('activeTab') && !changed.has('opened')) return;
        this.unregisterPanel?.();
        this.unregisterPanel = null;
        if (!this.opened) return;
        const handle = this.querySelector<PanelLifecycleHandle & Element>('lit-render-lab, lit-page-bridge-lab, lit-lifecycle-lab');
        if (handle !== null) this.unregisterPanel = this.panelRegistration.register(handle);
    }

    private selectTab(tab: ComponentLabTabKey, focus = true): void {
        if (this.activeTab === tab) return;
        this.deactivate();
        this.activeTab = tab;
        if (focus) void this.updateComplete.then(() => {
            const nextTab = this.querySelector<HTMLElement>(`#ft-${this.nickname}-tab-${tab}`);
            if (nextTab !== null) focusAndScrollComponentLabTab(nextTab);
        });
    }

    private tabKey(event: KeyboardEvent): void {
        const nextTab = getComponentLabTabForKey(this.activeTab, event.key);
        if (nextTab === null) return;
        event.preventDefault();
        this.selectTab(nextTab);
    }

    private renderPanel() {
        const id = `ft-${this.nickname}-panel-${this.activeTab}`;
        const labelledBy = `ft-${this.nickname}-tab-${this.activeTab}`;
        const describedBy = `ft-${this.nickname}-${this.activeTab}-description`;
        let content: TemplateResult | typeof nothing = nothing;
        switch (this.activeTab) {
            case 'task': content = html`<lit-task-workbench .nickname=${this.nickname}></lit-task-workbench>`; break;
            case 'render': content = html`<lit-render-lab .nickname=${this.nickname}></lit-render-lab>`; break;
            case 'page-bridge': content = html`<lit-page-bridge-lab .nickname=${this.nickname} .environment=${this.pageBridgeEnvironment}></lit-page-bridge-lab>`; break;
            case 'composition': content = html`<lit-composition-lab .nickname=${this.nickname}></lit-composition-lab>`; break;
            case 'lifecycle': content = html`<lit-lifecycle-lab .nickname=${this.nickname} .dependencies=${this.lifecycleDependencies}></lit-lifecycle-lab>`; break;
        }
        return html`<div id=${id} role="tabpanel" aria-labelledby=${labelledBy} aria-describedby=${describedBy}>${content}</div>`;
    }

    render() {
        return html`<dialog class="ft-showcase-dialog" aria-labelledby=${`ft-${this.nickname}-dialog-title`} tabindex="-1" data-ft-role="dialog" @cancel=${(event: Event) => { event.preventDefault(); this.close(); }} @click=${(event: MouseEvent) => { if (event.target === event.currentTarget) this.close(); }} @keydown=${(event: KeyboardEvent) => { if (this.dialog !== undefined) handleDialogTab(event, this.dialog); }}>
            <div class="ft-showcase-header"><h2 id=${`ft-${this.nickname}-dialog-title`}>Component lab</h2><button class="ft-showcase-button" type="button" aria-label="Close component lab" @click=${() => this.close()}>Close</button></div>
            <div class="ft-showcase-tabs" role="tablist" tabindex="-1" aria-label="Component lab sections" @keydown=${this.tabKey}>${COMPONENT_LAB_TABS.map(tab => html`<button id=${`ft-${this.nickname}-tab-${tab.key}`} class="ft-showcase-tab" data-ft-role=${`tab-${tab.key}`} role="tab" type="button" aria-selected=${this.activeTab === tab.key} aria-controls=${`ft-${this.nickname}-panel-${tab.key}`} tabindex=${this.activeTab === tab.key ? 0 : -1} @click=${() => this.selectTab(tab.key, false)}>${tab.label}</button>`)}</div>
            ${this.opened ? this.renderPanel() : nothing}
        </dialog>`;
    }
}

declare global { interface HTMLElementTagNameMap { 'lit-modal': LitModal; } }
