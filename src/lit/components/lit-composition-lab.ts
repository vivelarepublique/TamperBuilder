import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { COMPOSITION_COPY, INITIAL_COMPOSITION_FIXTURE, type CompositionStatus } from '../../common/components/composition';
import { BaseComponent } from '../extends/baseComponents';
import './lit-composition-card';

@customElement('lit-composition-lab')
export class LitCompositionLab extends BaseComponent {
    @property() nickname = '';
    @state() private expanded = INITIAL_COMPOSITION_FIXTURE.expanded;
    @state() private actionCount = INITIAL_COMPOSITION_FIXTURE.actionCount;
    @state() private status: CompositionStatus = INITIAL_COMPOSITION_FIXTURE.status;

    private get detailsId(): string { return `ft-${this.nickname}-composition-details`; }
    private get resetDisabled(): boolean { return !this.expanded && this.actionCount === 0 && this.status === 'Ready'; }
    private get statusCopy(): string { return this.actionCount === 0 ? COMPOSITION_COPY.initialStatus : `Preview action recorded. ${this.actionCount} total.`; }
    private toggleDetails(): void { this.expanded = !this.expanded; }
    private runPreviewAction(): void { this.actionCount += 1; this.status = 'Updated'; }
    private reset(): void { this.expanded = false; this.actionCount = 0; this.status = 'Ready'; }

    render() {
        const header = html`<h3 data-ft-role="composition-title">${COMPOSITION_COPY.title}</h3><span data-ft-role="composition-badge">${this.status}</span>`;
        const body = html`<p data-ft-role="composition-body">${COMPOSITION_COPY.body}</p>`;
        const details = html`<div id=${this.detailsId} data-ft-role="composition-details-content">${this.expanded ? html`<dl data-ft-role="composition-details-list"><div><dt>${COMPOSITION_COPY.environmentLabel}</dt><dd>${COMPOSITION_COPY.environmentValue}</dd></div><div><dt>${COMPOSITION_COPY.changeLabel}</dt><dd>${COMPOSITION_COPY.changeValue}</dd></div></dl>` : nothing}</div>`;
        const actions = html`<div class="ft-showcase-composition-actions" data-ft-role="composition-actions"><button class="ft-showcase-button" data-ft-role="composition-details-toggle" type="button" aria-expanded=${this.expanded} aria-controls=${this.detailsId} @click=${() => this.toggleDetails()}>${this.expanded ? COMPOSITION_COPY.hideDetails : COMPOSITION_COPY.showDetails}</button><button class="ft-showcase-button" data-ft-role="composition-run" type="button" @click=${() => this.runPreviewAction()}>${COMPOSITION_COPY.runAction}</button><button class="ft-showcase-button" data-ft-role="composition-reset" type="button" ?disabled=${this.resetDisabled} @click=${() => this.reset()}>${COMPOSITION_COPY.reset}</button></div>`;
        return html`<section data-ft-role="composition-lab">
            <p id=${`ft-${this.nickname}-composition-description`} data-ft-role="composition-description">${COMPOSITION_COPY.description}</p>
            <lit-composition-card .header=${header} .body=${body} .details=${details} .actions=${actions}></lit-composition-card>
            <p data-ft-role="composition-action-count">Actions: ${this.actionCount}</p>
            <div id=${`ft-${this.nickname}-composition-status`} role="status" aria-live="polite" aria-atomic="true" data-ft-role="composition-status">${this.statusCopy}</div>
        </section>`;
    }
}

declare global { interface HTMLElementTagNameMap { 'lit-composition-lab': LitCompositionLab; } }
