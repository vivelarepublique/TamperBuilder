import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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

export type LifecycleLabHandle = PanelLifecycleHandle;

type LifecycleRunState =
    | { readonly kind: 'idle' }
    | { readonly kind: 'running'; readonly runId: number }
    | { readonly kind: 'canceled' | 'completed' | 'error' };

interface LifecycleViewState {
    readonly currentStage: LifecycleStage | null;
    readonly progress: 0 | LifecycleProgress;
    readonly runsCompleted: number;
    readonly log: readonly string[];
}

function statusCopy(state: LifecycleRunState): string {
    switch (state.kind) {
        case 'idle': return 'Ready to start.';
        case 'running': return 'Task is running.';
        case 'canceled': return 'Task canceled. Restart or reset.';
        case 'completed': return 'Task completed.';
        case 'error': return 'Task could not complete. Restart or reset.';
    }
}

const LifecycleLab = forwardRef<LifecycleLabHandle, { readonly nickname: string; readonly dependencies: LifecycleLabDependencies }>(function LifecycleLab({ nickname, dependencies }, ref) {
    const [runState, setRunState] = useState<LifecycleRunState>({ kind: 'idle' });
    const [view, setView] = useState<LifecycleViewState>({ currentStage: null, progress: 0, runsCompleted: 0, log: [] });
    const runStateRef = useRef<LifecycleRunState>({ kind: 'idle' });
    const runSequenceRef = useRef(0);
    const activeRunIdRef = useRef<number | null>(null);
    const activeControllerRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(false);

    function commitRunState(nextState: LifecycleRunState): void {
        runStateRef.current = nextState;
        setRunState(nextState);
    }

    function isActiveRun(runId: number, controller: AbortController): boolean {
        return mountedRef.current && activeRunIdRef.current === runId && activeControllerRef.current === controller && !controller.signal.aborted;
    }

    function invalidateActiveRun(): void {
        const controller = activeControllerRef.current;
        activeRunIdRef.current = null;
        activeControllerRef.current = null;
        controller?.abort();
    }

    function failRun(runId: number, controller: AbortController, error: unknown): void {
        if (!isActiveRun(runId, controller)) return;
        activeRunIdRef.current = null;
        activeControllerRef.current = null;
        controller.abort();
        commitRunState({ kind: 'error' });
        setView(current => ({ ...current, log: appendLifecycleLog(current.log, formatLifecycleResultLog(runId, 'Failed')) }));
        console.error('Lifecycle lab task failed.', error);
    }

    async function executeRun(runId: number, controller: AbortController): Promise<void> {
        const validator = createLifecycleSequenceValidator();
        try {
            await dependencies.runTask({
                signal: controller.signal,
                scheduler: dependencies.scheduler,
                onStage(stage, progress) {
                    if (!isActiveRun(runId, controller)) return;
                    try {
                        validator.record(stage, progress);
                    } catch (error) {
                        failRun(runId, controller, error);
                        throw error;
                    }
                    if (!isActiveRun(runId, controller)) return;
                    setView(current => ({ ...current, currentStage: stage, progress, log: appendLifecycleLog(current.log, formatLifecycleStageLog(runId, stage)) }));
                },
            });
            if (!isActiveRun(runId, controller)) return;
            validator.assertComplete();
            if (!isActiveRun(runId, controller)) return;
            activeRunIdRef.current = null;
            activeControllerRef.current = null;
            commitRunState({ kind: 'completed' });
            setView(current => ({ ...current, runsCompleted: current.runsCompleted + 1 }));
        } catch (error) {
            failRun(runId, controller, error);
        }
    }

    function beginRun(): void {
        if (!mountedRef.current) return;
        invalidateActiveRun();
        const runId = ++runSequenceRef.current;
        const controller = new AbortController();
        activeRunIdRef.current = runId;
        activeControllerRef.current = controller;
        commitRunState({ kind: 'running', runId });
        setView(current => ({ ...current, currentStage: null, progress: 0 }));
        void executeRun(runId, controller);
    }

    function start(): void {
        if (runStateRef.current.kind === 'idle') beginRun();
    }

    function secondary(): void {
        const current = runStateRef.current;
        if (current.kind === 'running') {
            invalidateActiveRun();
            commitRunState({ kind: 'canceled' });
            setView(viewState => ({ ...viewState, log: appendLifecycleLog(viewState.log, formatLifecycleResultLog(current.runId, 'Canceled')) }));
        } else if (current.kind !== 'idle') {
            beginRun();
        }
    }

    function reset(): void {
        if (runStateRef.current.kind === 'idle') return;
        invalidateActiveRun();
        commitRunState({ kind: 'idle' });
        setView({ currentStage: null, progress: 0, runsCompleted: 0, log: [] });
    }

    const deactivate = useCallback(() => {
        mountedRef.current = false;
        const controller = activeControllerRef.current;
        activeRunIdRef.current = null;
        activeControllerRef.current = null;
        controller?.abort();
    }, []);

    useImperativeHandle(ref, () => ({ deactivate }), [deactivate]);
    useEffect(() => {
        mountedRef.current = true;
        return deactivate;
    }, [deactivate]);

    return <section data-ft-role='lifecycle-lab'>
        <p id={`ft-${nickname}-lifecycle-description`} data-ft-role='lifecycle-description'>{LIFECYCLE_DESCRIPTION}</p>
        <dl className='ft-showcase-lifecycle-summary' data-ft-role='lifecycle-summary'>
            <div className='ft-showcase-lifecycle-item' data-ft-role='lifecycle-current-stage'><dt>Current stage</dt><dd>{view.currentStage ?? 'Not started'}</dd></div>
            <div className='ft-showcase-lifecycle-item' data-ft-role='lifecycle-progress-summary'><dt>Progress</dt><dd>{view.progress}%</dd></div>
            <div className='ft-showcase-lifecycle-item' data-ft-role='lifecycle-runs-completed'><dt>Runs completed</dt><dd>{view.runsCompleted}</dd></div>
            <div className='ft-showcase-lifecycle-item' data-ft-role='lifecycle-status'><dt>Status</dt><dd>{statusCopy(runState)}</dd></div>
        </dl>
        <progress className='ft-showcase-lifecycle-progress' data-ft-role='lifecycle-progress' value={view.progress} max={100} aria-label='Lifecycle progress' />
        <div className='ft-showcase-lifecycle-actions' data-ft-role='lifecycle-actions'>
            <button className='ft-showcase-button' data-ft-role='lifecycle-start' type='button' disabled={runState.kind !== 'idle'} onClick={start}>Start</button>
            <button className='ft-showcase-button' data-ft-role='lifecycle-secondary' type='button' disabled={runState.kind === 'idle'} onClick={secondary}>{runState.kind === 'running' ? 'Cancel' : 'Restart'}</button>
            <button className='ft-showcase-button' data-ft-role='lifecycle-reset' type='button' disabled={runState.kind === 'idle'} onClick={reset}>Reset</button>
        </div>
        <ol className='ft-showcase-lifecycle-log' data-ft-role='lifecycle-log' aria-label='Event log'>
            {view.log.length === 0 ? <li data-ft-role='lifecycle-log-entry'>No events yet.</li> : view.log.map((entry, index) => <li key={`${index}-${entry}`} data-ft-role='lifecycle-log-entry'>{entry}</li>)}
        </ol>
    </section>;
});

export default LifecycleLab;
