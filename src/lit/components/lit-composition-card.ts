import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseComponent } from '../extends/baseComponents';

@customElement('lit-composition-card')
export class LitCompositionCard extends BaseComponent {
    @property({ attribute: false }) header: TemplateResult | typeof nothing = nothing;
    @property({ attribute: false }) body: TemplateResult | typeof nothing = nothing;
    @property({ attribute: false }) details: TemplateResult | typeof nothing = nothing;
    @property({ attribute: false }) actions: TemplateResult | typeof nothing = nothing;

    render() {
        return html`<article class="ft-showcase-composition-card" data-ft-role="composition-card">
            <header class="ft-showcase-composition-card-header" data-ft-role="composition-card-header">${this.header}</header>
            <div class="ft-showcase-composition-card-body" data-ft-role="composition-card-body">${this.body}</div>
            <div class="ft-showcase-composition-card-details" data-ft-role="composition-card-details">${this.details}</div>
            <footer class="ft-showcase-composition-card-footer" data-ft-role="composition-card-footer">${this.actions}</footer>
        </article>`;
    }
}

declare global { interface HTMLElementTagNameMap { 'lit-composition-card': LitCompositionCard; } }
