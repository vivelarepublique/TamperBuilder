import { batch, signal } from '@preact/signals';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';
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

function createLifecycleModel() {
    return {
        runState: signal<LifecycleRunState>({ kind: 'idle' }),
        currentStage: signal<LifecycleStage | null>(null),
        progress: signal<0 | LifecycleProgress>(0),
        runsCompleted: signal(0),
        log: signal<readonly string[]>([]),
    };
}

export default function LifecycleLab({ nickname, dependencies, registerLifecycle }: { readonly nickname: string; readonly dependencies: LifecycleLabDependencies; readonly registerLifecycle: (handle: PanelLifecycleHandle) => () => void }) {
    const model = useMemo(createLifecycleModel, []);
    const runSequenceRef = useRef(0);
    const activeRunIdRef = useRef<number | null>(null);
    const activeControllerRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(false);

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
        batch(() => {
            model.runState.value = { kind: 'error' };
            model.log.value = appendLifecycleLog(model.log.value, formatLifecycleResultLog(runId, 'Failed'));
        });
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
                    batch(() => {
                        model.currentStage.value = stage;
                        model.progress.value = progress;
                        model.log.value = appendLifecycleLog(model.log.value, formatLifecycleStageLog(runId, stage));
                    });
                },
            });
            if (!isActiveRun(runId, controller)) return;
            validator.assertComplete();
            if (!isActiveRun(runId, controller)) return;
            activeRunIdRef.current = null;
            activeControllerRef.current = null;
            batch(() => {
                model.runsCompleted.value += 1;
                model.runState.value = { kind: 'completed' };
            });
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
        batch(() => {
            model.currentStage.value = null;
            model.progress.value = 0;
            model.runState.value = { kind: 'running', runId };
        });
        void executeRun(runId, controller);
    }

    function start(): void { if (model.runState.value.kind === 'idle') beginRun(); }
    function secondary(): void {
        const current = model.runState.value;
        if (current.kind === 'running') {
            invalidateActiveRun();
            batch(() => {
                model.runState.value = { kind: 'canceled' };
                model.log.value = appendLifecycleLog(model.log.value, formatLifecycleResultLog(current.runId, 'Canceled'));
            });
        } else if (current.kind !== 'idle') beginRun();
    }
    function reset(): void {
        if (model.runState.value.kind === 'idle') return;
        invalidateActiveRun();
        batch(() => {
            model.runState.value = { kind: 'idle' };
            model.currentStage.value = null;
            model.progress.value = 0;
            model.runsCompleted.value = 0;
            model.log.value = [];
        });
    }

    const deactivate = useCallback(() => {
        mountedRef.current = false;
        const controller = activeControllerRef.current;
        activeRunIdRef.current = null;
        activeControllerRef.current = null;
        controller?.abort();
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        const unregister = registerLifecycle({ deactivate });
        return () => { deactivate(); unregister(); };
    }, [deactivate, registerLifecycle]);

    const currentState = model.runState.value;
    return <section data-ft-role='lifecycle-lab'>
        <p id={`ft-${nickname}-lifecycle-description`} data-ft-role='lifecycle-description'>{LIFECYCLE_DESCRIPTION}</p>
        <dl class='ft-showcase-lifecycle-summary' data-ft-role='lifecycle-summary'>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-current-stage'><dt>Current stage</dt><dd>{model.currentStage.value ?? 'Not started'}</dd></div>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-progress-summary'><dt>Progress</dt><dd>{model.progress.value}%</dd></div>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-runs-completed'><dt>Runs completed</dt><dd>{model.runsCompleted.value}</dd></div>
            <div class='ft-showcase-lifecycle-item' data-ft-role='lifecycle-status'><dt>Status</dt><dd>{statusCopy(currentState)}</dd></div>
        </dl>
        <progress class='ft-showcase-lifecycle-progress' data-ft-role='lifecycle-progress' value={model.progress.value} max={100} aria-label='Lifecycle progress' />
        <div class='ft-showcase-lifecycle-actions' data-ft-role='lifecycle-actions'>
            <button class='ft-showcase-button' data-ft-role='lifecycle-start' type='button' disabled={currentState.kind !== 'idle'} onClick={start}>Start</button>
            <button class='ft-showcase-button' data-ft-role='lifecycle-secondary' type='button' disabled={currentState.kind === 'idle'} onClick={secondary}>{currentState.kind === 'running' ? 'Cancel' : 'Restart'}</button>
            <button class='ft-showcase-button' data-ft-role='lifecycle-reset' type='button' disabled={currentState.kind === 'idle'} onClick={reset}>Reset</button>
        </div>
        <ol class='ft-showcase-lifecycle-log' data-ft-role='lifecycle-log' aria-label='Event log'>
            {model.log.value.length === 0 ? <li data-ft-role='lifecycle-log-entry'>No events yet.</li> : model.log.value.map((entry, index) => <li key={`${index}-${entry}`} data-ft-role='lifecycle-log-entry'>{entry}</li>)}
        </ol>
    </section>;
}
