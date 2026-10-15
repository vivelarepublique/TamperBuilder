import { consume } from '@lit/context';
import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { formatMilliseconds, isAbortError, isBenchmarkTimeoutError, type BenchmarkMetrics, type BenchmarkPhase, type BenchmarkRow, type BenchmarkSize } from '../../common/components/benchmark';
import type { PanelLifecycleHandle } from '../../common/components/dialog';
import { workbenchContext, type LitWorkbenchValue } from '../context/workbench-context';
import { BaseComponent } from '../extends/baseComponents';

type RenderStatus = { readonly kind: 'idle' } | { readonly kind: 'running'; readonly runId: number } | { readonly kind: 'success' } | { readonly kind: 'startHidden' } | { readonly kind: 'canceled' } | { readonly kind: 'timeout'; readonly phase: BenchmarkPhase } | { readonly kind: 'error' };

@customElement('lit-render-lab')
export class LitRenderLab extends BaseComponent implements PanelLifecycleHandle {
    @property() nickname = '';
    @consume({ context: workbenchContext, subscribe: true }) workbench?: LitWorkbenchValue;
    @state() private size: BenchmarkSize = 1000;
    @state() private rows: readonly BenchmarkRow[] = [];
    @state() private metrics: BenchmarkMetrics | null = null;
    @state() private status: RenderStatus = { kind: 'idle' };
    @state() private inputError: null | 'invalid-size' = null;
    private runSequence = 0;
    private activeRunId: number | null = null;
    private controller: AbortController | null = null;
    private mounted = false;
    private reportedMissingContext = false;

    connectedCallback(): void { super.connectedCallback(); this.mounted = true; this.addEventListener('cancel-active-run', this.cancelRequested); document.addEventListener('visibilitychange', this.visibilityChanged); }
    disconnectedCallback(): void { this.mounted = false; this.invalidateRun(); this.removeEventListener('cancel-active-run', this.cancelRequested); document.removeEventListener('visibilitychange', this.visibilityChanged); super.disconnectedCallback(); }
    protected firstUpdated(): void { if (this.workbench === undefined && !this.reportedMissingContext) { this.reportedMissingContext = true; console.error('Lit component state is unavailable.'); } }

    private get running(): boolean { return this.status.kind === 'running'; }
    private get strictInitial(): boolean { return this.size === 1000 && this.rows.length === 0 && this.metrics === null && this.status.kind === 'idle' && this.inputError === null; }
    private readonly cancelRequested = () => this.deactivate();
    private readonly visibilityChanged = () => { if (document.hidden && this.running) this.cancel(); };
    private invalidateRun(): void { this.controller?.abort(); this.runSequence += 1; this.activeRunId = null; this.controller = null; }
    private cancel(): void { if (!this.running) return; this.invalidateRun(); this.rows = []; this.metrics = null; this.status = { kind: 'canceled' }; }
    private reset(): void { if (this.running || this.strictInitial) return; this.size = 1000; this.rows = []; this.metrics = null; this.status = { kind: 'idle' }; this.inputError = null; }
    private updateSize(event: Event): void { if (this.running) return; const control = event.currentTarget as HTMLSelectElement; const value = Number(control.value); if (value !== 250 && value !== 1000 && value !== 2000) { control.value = String(this.size); this.inputError = 'invalid-size'; return; } this.size = value; this.inputError = null; }

    private async run(): Promise<void> {
        if (this.running || this.workbench === undefined) return;
        this.inputError = null;
        if (document.hidden) { this.status = { kind: 'startHidden' }; return; }
        const runId = ++this.runSequence;
        this.activeRunId = runId;
        const activeController = new AbortController();
        this.controller = activeController;
        this.rows = []; this.metrics = null; this.status = { kind: 'running', runId };
        try {
            const dependencies = this.workbench.dependencies;
            const commitRows = (rows: readonly BenchmarkRow[]) => {
                if (this.activeRunId === runId && !activeController.signal.aborted && this.mounted) this.rows = rows;
            };
            const result = await dependencies.runScenario({ size: this.size, adapter: { replaceRows: commitRows, updateRows: commitRows, removeRows: commitRows, clearRows: commitRows }, scheduler: dependencies.scheduler, signal: activeController.signal });
            if (this.activeRunId !== runId || activeController.signal.aborted || !this.mounted) return;
            formatMilliseconds(result.createMs); formatMilliseconds(result.updateMs); formatMilliseconds(result.removeMs);
            if (!Number.isInteger(result.remainingRows) || result.remainingRows < 0) throw new RangeError('Remaining rows must be a non-negative integer.');
            this.metrics = result; this.status = { kind: 'success' };
        } catch (error) {
            if (this.activeRunId !== runId || activeController.signal.aborted || !this.mounted || isAbortError(error)) return;
            this.rows = []; this.metrics = null;
            if (isBenchmarkTimeoutError(error)) { this.status = { kind: 'timeout', phase: error.phase }; console.warn('Render lab phase timed out.', { phase: error.phase, size: this.size }); }
            else { this.status = { kind: 'error' }; console.error('Render lab scenario failed.', error); }
        } finally { if (this.activeRunId === runId && !activeController.signal.aborted && this.mounted) { this.activeRunId = null; this.controller = null; } }
    }

    deactivate(): void {
        if (this.activeRunId !== null) this.invalidateRun();
    }

    private statusCopy(): string { switch (this.status.kind) { case 'running': return 'Running…'; case 'success': return 'Scenario complete.'; case 'startHidden': return 'Keep this page visible, then try again.'; case 'canceled': return 'Scenario canceled.'; case 'timeout': return 'Scenario timed out. Try again or reset.'; case 'error': return 'Scenario could not complete.'; default: return ''; } }

    render() {
        if (this.workbench === undefined) return html`<div class="ft-showcase-error" role="alert">Component state is unavailable.</div>`;
        return html`<section data-ft-role="render-lab"><p id=${`ft-${this.nickname}-render-description`} data-ft-role="render-description">Run one bounded create, update, and remove scenario.</p><p class="ft-showcase-muted" data-ft-role="render-disclaimer">Results reflect one interaction on this page, device, and build. They are not a scientific cross-framework benchmark.</p>
            <div class="ft-showcase-render-controls" data-ft-role="render-controls"><div class="ft-showcase-field" data-ft-role="render-size-field"><label class="ft-showcase-label" for=${`ft-${this.nickname}-render-size`}>Row count</label><select id=${`ft-${this.nickname}-render-size`} class="ft-showcase-select" data-ft-role="render-size" .value=${String(this.size)} ?disabled=${this.running} aria-invalid=${this.inputError ? 'true' : nothing} aria-errormessage=${this.inputError ? `ft-${this.nickname}-render-error` : nothing} @change=${this.updateSize}><option value="250">250</option><option value="1000">1000</option><option value="2000">2000</option></select></div><button class="ft-showcase-button" data-ft-role="render-run" type="button" ?disabled=${this.running} @click=${this.run}>Run scenario</button><button class="ft-showcase-button" data-ft-role="render-secondary" type="button" ?disabled=${!this.running && this.strictInitial} @click=${this.running ? this.cancel : this.reset}>${this.running ? 'Cancel' : 'Reset'}</button><div data-ft-role="render-error-slot">${this.inputError ? html`<div id=${`ft-${this.nickname}-render-error`} class="ft-showcase-error" role="alert">Choose a valid row count.</div>` : nothing}</div></div>
            <div role="status" aria-live="polite" aria-atomic="true" data-ft-role="render-status">${this.statusCopy()}</div><dl class="ft-showcase-metrics" data-ft-role="render-metrics"><div class="ft-showcase-metric" data-ft-role="metric-create"><dt>Create</dt><dd>${this.metrics ? formatMilliseconds(this.metrics.createMs) : '—'}</dd></div><div class="ft-showcase-metric" data-ft-role="metric-update"><dt>Update every 10th</dt><dd>${this.metrics ? formatMilliseconds(this.metrics.updateMs) : '—'}</dd></div><div class="ft-showcase-metric" data-ft-role="metric-remove"><dt>Remove every 7th</dt><dd>${this.metrics ? formatMilliseconds(this.metrics.removeMs) : '—'}</dd></div><div class="ft-showcase-metric" data-ft-role="metric-remaining"><dt>Remaining rows</dt><dd>${this.metrics ? this.metrics.remainingRows : '—'}</dd></div></dl>
            <table class="ft-showcase-table" data-ft-role="render-table"><thead><tr><th>ID</th><th>Label</th><th>Revision</th></tr></thead><tbody>${repeat(this.rows, row => row.id, row => html`<tr data-ft-role="render-row"><td>${row.id}</td><td>${row.label}</td><td>${row.revision === 0 ? '0' : '1 · Updated'}</td></tr>`)}</tbody></table></section>`;
    }
}

declare global { interface HTMLElementTagNameMap { 'lit-render-lab': LitRenderLab; } }
