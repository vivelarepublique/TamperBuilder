import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PanelLifecycleHandle } from '../../common/components/dialog';
import { createPageBridgeSubscription, getPageBridgePage, type PageBridgeEnvironment, type PageBridgeEventKind, type PageBridgeObservation, type PageBridgeSubscription } from '../../common/components/pageBridge';
import { BaseComponent } from '../extends/baseComponents';

function eventCopy(eventKind: PageBridgeEventKind): string { switch (eventKind) { case 'input': return 'Input'; case 'change': return 'Change'; case 'keyword-change': return 'Keyword changed'; case 'demo': return 'Demo event'; } }

@customElement('lit-page-bridge-lab')
export class LitPageBridgeLab extends BaseComponent implements PanelLifecycleHandle {
    @property() nickname = '';
    @property({ attribute: false }) environment?: PageBridgeEnvironment;
    @state() private observation: PageBridgeObservation = { page: 'Unsupported', found: false, displayValue: '—', eventKind: null };
    @state() private observedEvents = 0;
    @state() private lastEvent = '—';
    @state() private statusCopy = '';
    @state() private fatal = false;
    private subscription: PageBridgeSubscription | null = null;
    private active = false;

    connectedCallback(): void { super.connectedCallback(); this.active = true; }
    protected firstUpdated(): void {
        if (this.environment === undefined) { this.markFatal(); return; }
        this.observation = { page: getPageBridgePage(this.environment.hostname), found: false, displayValue: '—', eventKind: null };
        try { this.subscription = createPageBridgeSubscription(this.environment, this.commitObservation, this.markFatal); this.subscription.start(); } catch { this.markFatal(); }
    }
    disconnectedCallback(): void { this.deactivate(); super.disconnectedCallback(); }

    private readonly commitObservation = (nextObservation: PageBridgeObservation): void => {
        if (!this.active || this.fatal) return;
        this.observation = nextObservation;
        this.statusCopy = nextObservation.found ? 'Target found.' : 'Target not found.';
        if (nextObservation.eventKind !== null) { this.observedEvents += 1; this.lastEvent = eventCopy(nextObservation.eventKind); }
    };
    private readonly markFatal = (): void => { if (!this.active || this.fatal) return; this.fatal = true; this.statusCopy = ''; console.error('Page bridge adapter became unavailable.'); };
    deactivate(): void { this.active = false; this.subscription?.dispose(); this.subscription = null; }
    private refresh(): void { if (!this.fatal) this.subscription?.refresh(); }
    private focusAndHighlight(): void { if (this.fatal) return; const result = this.subscription?.focusAndHighlight(); if (result === 'focused') this.statusCopy = 'Target focused and highlighted.'; else if (result === 'not-found') this.statusCopy = 'Target not found.'; else if (result === 'failed') this.statusCopy = 'Page bridge action could not complete.'; }
    private dispatchDemoEvent(): void { if (this.fatal) return; const result = this.subscription?.dispatchDemoEvent(); if (result === 'dispatched') this.statusCopy = 'Demo event dispatched.'; else if (result === 'not-found') this.statusCopy = 'Target not found.'; else if (result === 'failed') this.statusCopy = 'Page bridge action could not complete.'; }
    private reset(): void { if (this.fatal) return; this.subscription?.clearHighlight(); this.observedEvents = 0; this.lastEvent = '—'; this.subscription?.refresh(); }

    render() {
        return html`<section data-ft-role="page-bridge-lab">
            <p id=${`ft-${this.nickname}-page-bridge-description`} data-ft-role="page-bridge-description">Observe a supported page search input without changing its value.</p>
            <dl class="ft-showcase-page-bridge-summary" data-ft-role="page-bridge-summary">
                <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-target-status"><dt>Target status</dt><dd>${this.observation.found ? 'Found' : 'Not found'}</dd></div>
                <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-page"><dt>Page</dt><dd>${this.observation.page}</dd></div>
                <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-current-input-item"><dt>Current input</dt><dd><output class="ft-showcase-page-bridge-value" data-ft-role="page-bridge-current-input">${this.observation.displayValue}</output></dd></div>
                <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-observed-events"><dt>Observed events</dt><dd>${this.observedEvents}</dd></div>
                <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-last-event"><dt>Last event</dt><dd>${this.lastEvent}</dd></div>
            </dl>
            <div class="ft-showcase-page-bridge-actions" data-ft-role="page-bridge-actions">
                <button class="ft-showcase-button" data-ft-role="page-bridge-refresh" type="button" ?disabled=${this.fatal} @click=${this.refresh}>Refresh target</button>
                <button class="ft-showcase-button" data-ft-role="page-bridge-focus" type="button" ?disabled=${this.fatal} @click=${this.focusAndHighlight}>Focus &amp; highlight</button>
                <button class="ft-showcase-button" data-ft-role="page-bridge-demo" type="button" ?disabled=${this.fatal} @click=${this.dispatchDemoEvent}>Dispatch demo event</button>
                <button class="ft-showcase-button" data-ft-role="page-bridge-reset" type="button" ?disabled=${this.fatal} @click=${this.reset}>Reset</button>
            </div>
            <div id=${`ft-${this.nickname}-page-bridge-status`} role="status" aria-live="polite" aria-atomic="true" data-ft-role="page-bridge-status">${this.statusCopy}</div>
            <div data-ft-role="page-bridge-error-slot">${this.fatal ? html`<div id=${`ft-${this.nickname}-page-bridge-error`} class="ft-showcase-error" role="alert">Page bridge is unavailable.</div>` : nothing}</div>
        </section>`;
    }
}

declare global { interface HTMLElementTagNameMap { 'lit-page-bridge-lab': LitPageBridgeLab; } }
