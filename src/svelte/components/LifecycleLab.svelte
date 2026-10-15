<script lang="ts">
    import { onMount } from 'svelte';
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

    type LifecycleRunState =
        | { readonly kind: 'idle' }
        | { readonly kind: 'running'; readonly runId: number }
        | { readonly kind: 'canceled' | 'completed' | 'error' };

    let { nickname, dependencies }: { nickname: string; dependencies: LifecycleLabDependencies } = $props();
    let runState = $state<LifecycleRunState>({ kind: 'idle' });
    let currentStage = $state<LifecycleStage | null>(null);
    let progress = $state<0 | LifecycleProgress>(0);
    let runsCompleted = $state(0);
    let eventLog = $state<readonly string[]>([]);
    let runSequence = 0;
    let activeRunId: number | null = null;
    let activeController: AbortController | null = null;
    let mounted = false;

    function statusCopy(): string {
        switch (runState.kind) {
            case 'idle': return 'Ready to start.';
            case 'running': return 'Task is running.';
            case 'canceled': return 'Task canceled. Restart or reset.';
            case 'completed': return 'Task completed.';
            case 'error': return 'Task could not complete. Restart or reset.';
        }
    }

    function isActiveRun(runId: number, controller: AbortController): boolean {
        return mounted && activeRunId === runId && activeController === controller && !controller.signal.aborted;
    }
    function invalidateActiveRun(): void {
        const controller = activeController;
        activeRunId = null;
        activeController = null;
        controller?.abort();
    }
    function failRun(runId: number, controller: AbortController, error: unknown): void {
        if (!isActiveRun(runId, controller)) return;
        activeRunId = null;
        activeController = null;
        controller.abort();
        runState = { kind: 'error' };
        eventLog = appendLifecycleLog(eventLog, formatLifecycleResultLog(runId, 'Failed'));
        console.error('Lifecycle lab task failed.', error);
    }
    async function executeRun(runId: number, controller: AbortController): Promise<void> {
        const validator = createLifecycleSequenceValidator();
        try {
            await dependencies.runTask({
                signal: controller.signal,
                scheduler: dependencies.scheduler,
                onStage(stage, nextProgress) {
                    if (!isActiveRun(runId, controller)) return;
                    try {
                        validator.record(stage, nextProgress);
                    } catch (error) {
                        failRun(runId, controller, error);
                        throw error;
                    }
                    if (!isActiveRun(runId, controller)) return;
                    currentStage = stage;
                    progress = nextProgress;
                    eventLog = appendLifecycleLog(eventLog, formatLifecycleStageLog(runId, stage));
                },
            });
            if (!isActiveRun(runId, controller)) return;
            validator.assertComplete();
            if (!isActiveRun(runId, controller)) return;
            activeRunId = null;
            activeController = null;
            runsCompleted += 1;
            runState = { kind: 'completed' };
        } catch (error) {
            failRun(runId, controller, error);
        }
    }
    function beginRun(): void {
        if (!mounted) return;
        invalidateActiveRun();
        const runId = ++runSequence;
        const controller = new AbortController();
        activeRunId = runId;
        activeController = controller;
        currentStage = null;
        progress = 0;
        runState = { kind: 'running', runId };
        void executeRun(runId, controller);
    }
    function start(): void { if (runState.kind === 'idle') beginRun(); }
    function secondary(): void {
        const current = runState;
        if (current.kind === 'running') {
            invalidateActiveRun();
            runState = { kind: 'canceled' };
            eventLog = appendLifecycleLog(eventLog, formatLifecycleResultLog(current.runId, 'Canceled'));
        } else if (current.kind !== 'idle') beginRun();
    }
    function reset(): void {
        if (runState.kind === 'idle') return;
        invalidateActiveRun();
        runState = { kind: 'idle' };
        currentStage = null;
        progress = 0;
        runsCompleted = 0;
        eventLog = [];
    }
    export function deactivate(): void { mounted = false; invalidateActiveRun(); }

    onMount(() => { mounted = true; return deactivate; });
</script>

<section data-ft-role="lifecycle-lab">
    <p id={`ft-${nickname}-lifecycle-description`} data-ft-role="lifecycle-description">{LIFECYCLE_DESCRIPTION}</p>
    <dl class="ft-showcase-lifecycle-summary" data-ft-role="lifecycle-summary">
        <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-current-stage"><dt>Current stage</dt><dd>{currentStage ?? 'Not started'}</dd></div>
        <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-progress-summary"><dt>Progress</dt><dd>{progress}%</dd></div>
        <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-runs-completed"><dt>Runs completed</dt><dd>{runsCompleted}</dd></div>
        <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-status"><dt>Status</dt><dd>{statusCopy()}</dd></div>
    </dl>
    <progress class="ft-showcase-lifecycle-progress" data-ft-role="lifecycle-progress" value={progress} max="100" aria-label="Lifecycle progress"></progress>
    <div class="ft-showcase-lifecycle-actions" data-ft-role="lifecycle-actions">
        <button class="ft-showcase-button" data-ft-role="lifecycle-start" type="button" disabled={runState.kind !== 'idle'} onclick={start}>Start</button>
        <button class="ft-showcase-button" data-ft-role="lifecycle-secondary" type="button" disabled={runState.kind === 'idle'} onclick={secondary}>{runState.kind === 'running' ? 'Cancel' : 'Restart'}</button>
        <button class="ft-showcase-button" data-ft-role="lifecycle-reset" type="button" disabled={runState.kind === 'idle'} onclick={reset}>Reset</button>
    </div>
    <ol class="ft-showcase-lifecycle-log" data-ft-role="lifecycle-log" aria-label="Event log">
        {#if eventLog.length === 0}<li data-ft-role="lifecycle-log-entry">No events yet.</li>{:else}{#each eventLog as entry, index (`${index}-${entry}`)}<li data-ft-role="lifecycle-log-entry">{entry}</li>{/each}{/if}
    </ol>
</section>
