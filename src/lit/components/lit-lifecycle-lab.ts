import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PanelLifecycleHandle } from '../../common/components/dialog';
import {
    LIFECYCLE_DESCRIPTION,
    appendLifecycleLog,
    createLifecycleSequenceValidator,
    formatLifecycleResultLog,
    formatLifecycleStageLog,
    type LifecycleLabDependencies,
    type LifecycleProgress,
    type LifecycleStage,
} from '../../common/components/lifecycle';
import { BaseComponent } from '../extends/baseComponents';

type LifecycleRunState =
    | { readonly kind: 'idle' }
    | { readonly kind: 'running'; readonly runId: number }
    | { readonly kind: 'canceled' | 'completed' | 'error' };

@customElement('lit-lifecycle-lab')
export class LitLifecycleLab extends BaseComponent implements PanelLifecycleHandle {
    @property() nickname = '';
    @property({ attribute: false }) dependencies?: LifecycleLabDependencies;
    @state() private runState: LifecycleRunState = { kind: 'idle' };
    @state() private currentStage: LifecycleStage | null = null;
    @state() private progress: 0 | LifecycleProgress = 0;
    @state() private runsCompleted = 0;
    @state() private eventLog: readonly string[] = [];
    private runSequence = 0;
    private activeRunId: number | null = null;
    private activeController: AbortController | null = null;
    private mounted = false;

    connectedCallback(): void { super.connectedCallback(); this.mounted = true; }
    disconnectedCallback(): void { this.deactivate(); super.disconnectedCallback(); }

    private get statusCopy(): string {
        switch (this.runState.kind) {
            case 'idle': return 'Ready to start.';
            case 'running': return 'Task is running.';
            case 'canceled': return 'Task canceled. Restart or reset.';
            case 'completed': return 'Task completed.';
            case 'error': return 'Task could not complete. Restart or reset.';
        }
    }

    private isActiveRun(runId: number, controller: AbortController): boolean {
        return this.mounted && this.activeRunId === runId && this.activeController === controller && !controller.signal.aborted;
    }

    private invalidateActiveRun(): void {
        const controller = this.activeController;
        this.activeRunId = null;
        this.activeController = null;
        controller?.abort();
    }

    private failRun(runId: number, controller: AbortController, error: unknown): void {
        if (!this.isActiveRun(runId, controller)) return;
        this.activeRunId = null;
        this.activeController = null;
        controller.abort();
        this.runState = { kind: 'error' };
        this.eventLog = appendLifecycleLog(this.eventLog, formatLifecycleResultLog(runId, 'Failed'));
        console.error('Lifecycle lab task failed.', error);
    }

    private async executeRun(runId: number, controller: AbortController, dependencies: LifecycleLabDependencies): Promise<void> {
        const validator = createLifecycleSequenceValidator();
        try {
            await dependencies.runTask({
                signal: controller.signal,
                scheduler: dependencies.scheduler,
                onStage: (stage, progress) => {
                    if (!this.isActiveRun(runId, controller)) return;
                    try {
                        validator.record(stage, progress);
                    } catch (error) {
                        this.failRun(runId, controller, error);
                        throw error;
                    }
                    if (!this.isActiveRun(runId, controller)) return;
                    this.currentStage = stage;
                    this.progress = progress;
                    this.eventLog = appendLifecycleLog(this.eventLog, formatLifecycleStageLog(runId, stage));
                },
            });
            if (!this.isActiveRun(runId, controller)) return;
            validator.assertComplete();
            if (!this.isActiveRun(runId, controller)) return;
            this.activeRunId = null;
            this.activeController = null;
            this.runsCompleted += 1;
            this.runState = { kind: 'completed' };
        } catch (error) {
            this.failRun(runId, controller, error);
        }
    }

    private beginRun(): void {
        if (!this.mounted) return;
        this.invalidateActiveRun();
        const runId = ++this.runSequence;
        const controller = new AbortController();
        this.activeRunId = runId;
        this.activeController = controller;
        this.currentStage = null;
        this.progress = 0;
        this.runState = { kind: 'running', runId };
        const dependencies = this.dependencies;
        if (dependencies === undefined) {
            this.failRun(runId, controller, new TypeError('Lifecycle dependencies are required.'));
            return;
        }
        void this.executeRun(runId, controller, dependencies);
    }

    private start(): void { if (this.runState.kind === 'idle') this.beginRun(); }
    private secondary(): void {
        const current = this.runState;
        if (current.kind === 'running') {
            this.invalidateActiveRun();
            this.runState = { kind: 'canceled' };
            this.eventLog = appendLifecycleLog(this.eventLog, formatLifecycleResultLog(current.runId, 'Canceled'));
        } else if (current.kind !== 'idle') this.beginRun();
    }
    private reset(): void {
        if (this.runState.kind === 'idle') return;
        this.invalidateActiveRun();
        this.runState = { kind: 'idle' };
        this.currentStage = null;
        this.progress = 0;
        this.runsCompleted = 0;
        this.eventLog = [];
    }
    deactivate(): void { this.mounted = false; this.invalidateActiveRun(); }

    render() {
        return html`<section data-ft-role="lifecycle-lab">
            <p id=${`ft-${this.nickname}-lifecycle-description`} data-ft-role="lifecycle-description">${LIFECYCLE_DESCRIPTION}</p>
            <dl class="ft-showcase-lifecycle-summary" data-ft-role="lifecycle-summary">
                <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-current-stage"><dt>Current stage</dt><dd>${this.currentStage ?? 'Not started'}</dd></div>
                <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-progress-summary"><dt>Progress</dt><dd>${this.progress}%</dd></div>
                <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-runs-completed"><dt>Runs completed</dt><dd>${this.runsCompleted}</dd></div>
                <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-status"><dt>Status</dt><dd>${this.statusCopy}</dd></div>
            </dl>
            <progress class="ft-showcase-lifecycle-progress" data-ft-role="lifecycle-progress" value=${this.progress} max="100" aria-label="Lifecycle progress"></progress>
            <div class="ft-showcase-lifecycle-actions" data-ft-role="lifecycle-actions">
                <button class="ft-showcase-button" data-ft-role="lifecycle-start" type="button" ?disabled=${this.runState.kind !== 'idle'} @click=${this.start}>Start</button>
                <button class="ft-showcase-button" data-ft-role="lifecycle-secondary" type="button" ?disabled=${this.runState.kind === 'idle'} @click=${this.secondary}>${this.runState.kind === 'running' ? 'Cancel' : 'Restart'}</button>
                <button class="ft-showcase-button" data-ft-role="lifecycle-reset" type="button" ?disabled=${this.runState.kind === 'idle'} @click=${this.reset}>Reset</button>
            </div>
            <ol class="ft-showcase-lifecycle-log" data-ft-role="lifecycle-log" aria-label="Event log">
                ${this.eventLog.length === 0 ? html`<li data-ft-role="lifecycle-log-entry">No events yet.</li>` : this.eventLog.map(entry => html`<li data-ft-role="lifecycle-log-entry">${entry}</li>`)}
            </ol>
        </section>`;
    }
}

declare global { interface HTMLElementTagNameMap { 'lit-lifecycle-lab': LitLifecycleLab; } }
