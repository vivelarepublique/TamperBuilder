import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BaseComponent } from './extends/baseComponents';

import litLogo from '../assets/svg/lit.svg';

import { provide } from '@lit/context';
import { showStore, showContext } from './context/show-context';
import { CounterStore, counterContext } from './context/counter-context';
import { BenchmarkStore, benchmarkContext } from './context/benchmark-context';

import './components/lit-modal';

@customElement('lit-app')
export class LitApp extends BaseComponent {
    @provide({ context: showContext })
    showStore: showStore = new showStore();

    @provide({ context: counterContext })
    counterStore: CounterStore = new CounterStore();

    @provide({ context: benchmarkContext })
    benchmarkStore: BenchmarkStore = new BenchmarkStore();

    @property({ type: Boolean })
    _focus = false;

    _open() {
        this.showStore.open();
        this.requestUpdate();
    }

    handleShowChanged(event: CustomEvent) {
        if (!event.detail) {
            this.showStore.close();
            this.requestUpdate();
        }
    }

    render() {
        return html`
            <button id="framework-test-lit-modal" class="button framework-test-modal-switch" @click=${this._open} @mouseover=${() => (this._focus = true)} @mouseout=${() => (this._focus = false)} part="button">
                ${this._focus ? html`<span>More</span>` : nothing}
                <img src=${litLogo} class="ft-button-logo" alt="Lit logo" />
            </button>
            ${this.showStore.show ? html`<lit-modal @show-changed=${this.handleShowChanged} .msg="${'Welcome Lit'}"></lit-modal>` : nothing}
        `;
    }

    static styles = css`
        #framework-test-lit-modal {
            top: 40%;
            background-color: var(--ft-border-color-lit);
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        'lit-app': LitApp;
    }
}
