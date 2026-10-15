import { batch, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
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

type LifecycleRunState =
    | { readonly kind: 'idle' }
    | { readonly kind: 'running'; readonly runId: number }
    | { readonly kind: 'canceled' | 'completed' | 'error' };

function statusCopy(state: LifecycleRunState): string {
    switch (state.kind) {
        case 'idle': return 'Ready to start.';
        case 'running': return 'Task is running.';
        case 'canceled': return 'Task canceled. Restart or reset.';
        case 'completed': return 'Task completed.';
        case 'error': return 'Task could not complete. Restart or reset.';
    }
}

export default function LifecycleLab(props: { readonly nickname: string; readonly dependencies: LifecycleLabDependencies; readonly registerLifecycle: (handle: PanelLifecycleHandle) => () => void }) {
    // Injected dependencies are immutable for the lifetime of this mounted panel.
    // eslint-disable-next-line solid/reactivity
    const dependencies = props.dependencies;
    const [runState, setRunState] = createSignal<LifecycleRunState>({ kind: 'idle' });
    const [currentStage, setCurrentStage] = createSignal<LifecycleStage | null>(null);
    const [progress, setProgress] = createSignal<0 | LifecycleProgress>(0);
    const [runsCompleted, setRunsCompleted] = createSignal(0);
    const [eventLog, setEventLog] = createSignal<readonly string[]>([]);
    let runSequence = 0;
    let activeRunId: number | null = null;
    let activeController: AbortController | null = null;
    let mounted = false;
    let unregister: (() => void) | null = null;

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
        batch(() => {
            setRunState({ kind: 'error' });
            setEventLog(log => appendLifecycleLog(log, formatLifecycleResultLog(runId, 'Failed')));
        });
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
                    batch(() => {
                        setCurrentStage(stage);
                        setProgress(nextProgress);
                        setEventLog(log => appendLifecycleLog(log, formatLifecycleStageLog(runId, stage)));
                    });
                },
            });
            if (!isActiveRun(runId, controller)) return;
            validator.assertComplete();
            if (!isActiveRun(runId, controller)) return;
            activeRunId = null;
            activeController = null;
            batch(() => {
                setRunsCompleted(count => count + 1);
                setRunState({ kind: 'completed' });
            });
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
        batch(() => {
            setCurrentStage(null);
            setProgress(0);
            setRunState({ kind: 'running', runId });
        });
        void executeRun(runId, controller);
    }
    function start(): void { if (runState().kind === 'idle') beginRun(); }
    function secondary(): void {
        const current = runState();
        if (current.kind === 'running') {
            invalidateActiveRun();
            batch(() => {
                setRunState({ kind: 'canceled' });
                setEventLog(log => appendLifecycleLog(log, formatLifecycleResultLog(current.runId, 'Canceled')));
            });
        } else if (current.kind !== 'idle') beginRun();
    }
    function reset(): void {
        if (runState().kind === 'idle') return;
        invalidateActiveRun();
        batch(() => {
            setRunState({ kind: 'idle' });
            setCurrentStage(null);
            setProgress(0);
            setRunsCompleted(0);
            setEventLog([]);
        });
    }
    function deactivate(): void { mounted = false; invalidateActiveRun(); }

    onMount(() => {
        mounted = true;
        unregister = props.registerLifecycle({ deactivate });
    });
    onCleanup(() => { deactivate(); unregister?.(); unregister = null; });

    return <section data-ft-role='lifecycle-lab'>
        <p id={`ft-${props.nickname}-lifecycle-description`} data-ft-role='lifecycle-description'>{LIFECYCLE_DESCRIPTION}</p>
        <dl class='ft-showcase-lifecycle-summary' data-ft-role='lifecycle-summary'>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-current-stage'><dt>Current stage</dt><dd>{currentStage() ?? 'Not started'}</dd></div>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-progress-summary'><dt>Progress</dt><dd>{progress()}%</dd></div>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-runs-completed'><dt>Runs completed</dt><dd>{runsCompleted()}</dd></div>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-status'><dt>Status</dt><dd>{statusCopy(runState())}</dd></div>
        </dl>
        <progress class='ft-showcase-lifecycle-progress' data-ft-role='lifecycle-progress' value={progress()} max={100} aria-label='Lifecycle progress' />
        <div class='ft-showcase-lifecycle-actions' data-ft-role='lifecycle-actions'>
            <button class='ft-showcase-button' data-ft-role='lifecycle-start' type='button' disabled={runState().kind !== 'idle'} onClick={start}>Start</button>
            <button class='ft-showcase-button' data-ft-role='lifecycle-secondary' type='button' disabled={runState().kind === 'idle'} onClick={secondary}>{runState().kind === 'running' ? 'Cancel' : 'Restart'}</button>
            <button class='ft-showcase-button' data-ft-role='lifecycle-reset' type='button' disabled={runState().kind === 'idle'} onClick={reset}>Reset</button>
        </div>
        <ol class='ft-showcase-lifecycle-log' data-ft-role='lifecycle-log' aria-label='Event log'>
            <Show when={eventLog().length > 0} fallback={<li data-ft-role='lifecycle-log-entry'>No events yet.</li>}>
                <For each={eventLog()}>{entry => <li data-ft-role='lifecycle-log-entry'>{entry}</li>}</For>
            </Show>
        </ol>
    </section>;
}
