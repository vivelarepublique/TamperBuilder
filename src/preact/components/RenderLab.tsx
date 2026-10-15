import { batch, signal } from '@preact/signals';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';
import {
    formatMilliseconds,
    isAbortError,
    isBenchmarkTimeoutError,
    type BenchmarkMetrics,
    type BenchmarkPhase,
    type BenchmarkRow,
    type BenchmarkSize,
    type RenderLabDependencies,
} from '../../common/components/benchmark';

type RenderStatus = { readonly kind: 'idle' } | { readonly kind: 'running'; readonly runId: number } | { readonly kind: 'success' } | { readonly kind: 'startHidden' } | { readonly kind: 'canceled' } | { readonly kind: 'timeout'; readonly phase: BenchmarkPhase } | { readonly kind: 'error' };

function createRenderModel() {
    const size = signal<BenchmarkSize>(1000);
    const rows = signal<readonly BenchmarkRow[]>([]);
    const metrics = signal<BenchmarkMetrics | null>(null);
    const status = signal<RenderStatus>({ kind: 'idle' });
    const inputError = signal<null | 'invalid-size'>(null);
    return {
        size, rows, metrics, status, inputError,
        setRows(nextRows: readonly BenchmarkRow[]) { rows.value = nextRows; },
        setInputError(error: null | 'invalid-size') { inputError.value = error; },
        setStartHidden() { status.value = { kind: 'startHidden' }; },
        setRunning(runId: number) { batch(() => { rows.value = []; metrics.value = null; status.value = { kind: 'running', runId }; }); },
        setCanceled() { batch(() => { rows.value = []; metrics.value = null; status.value = { kind: 'canceled' }; }); },
        setSuccess(result: BenchmarkMetrics) { batch(() => { metrics.value = result; status.value = { kind: 'success' }; }); },
        setFailure(nextStatus: RenderStatus) { batch(() => { rows.value = []; metrics.value = null; status.value = nextStatus; }); },
        setSize(value: BenchmarkSize) { batch(() => { size.value = value; inputError.value = null; }); },
        reset() { batch(() => { size.value = 1000; rows.value = []; metrics.value = null; status.value = { kind: 'idle' }; inputError.value = null; }); },
    };
}

function statusCopy(status: RenderStatus): string {
    switch (status.kind) {
        case 'running': return 'Running…'; case 'success': return 'Scenario complete.'; case 'startHidden': return 'Keep this page visible, then try again.'; case 'canceled': return 'Scenario canceled.'; case 'timeout': return 'Scenario timed out. Try again or reset.'; case 'error': return 'Scenario could not complete.'; default: return '';
    }
}

export default function RenderLab({ nickname, dependencies }: { readonly nickname: string; readonly dependencies: RenderLabDependencies }) {
    const model = useMemo(createRenderModel, []);
    const runSequenceRef = useRef(0);
    const activeRunIdRef = useRef<number | null>(null);
    const controllerRef = useRef<AbortController | null>(null);
    const mountedRef = useRef(true);
    const running = model.status.value.kind === 'running';
    const strictInitial = model.size.value === 1000 && model.rows.value.length === 0 && model.metrics.value === null && model.status.value.kind === 'idle' && model.inputError.value === null;

    const invalidateRun = useCallback(() => {
        controllerRef.current?.abort();
        runSequenceRef.current += 1;
        activeRunIdRef.current = null;
        controllerRef.current = null;
    }, []);
    const cancel = useCallback(() => {
        if (activeRunIdRef.current === null) return;
        invalidateRun();
        model.setCanceled();
    }, [invalidateRun, model]);

    useEffect(() => {
        mountedRef.current = true;
        const listener = () => { if (document.hidden && activeRunIdRef.current !== null) cancel(); };
        document.addEventListener('visibilitychange', listener);
        return () => { mountedRef.current = false; invalidateRun(); document.removeEventListener('visibilitychange', listener); };
    }, [cancel, invalidateRun]);

    async function run(): Promise<void> {
        if (activeRunIdRef.current !== null) return;
        model.setInputError(null);
        if (document.hidden) { model.setStartHidden(); return; }
        const runId = ++runSequenceRef.current;
        activeRunIdRef.current = runId;
        const activeController = new AbortController();
        controllerRef.current = activeController;
        model.setRunning(runId);
        try {
            const result = await dependencies.runScenario({
                size: model.size.value,
                adapter: {
                    replaceRows: rows => model.setRows(rows),
                    updateRows: rows => model.setRows(rows),
                    removeRows: rows => model.setRows(rows),
                    clearRows: rows => model.setRows(rows),
                },
                scheduler: dependencies.scheduler,
                signal: activeController.signal,
            });
            if (activeRunIdRef.current !== runId || activeController.signal.aborted || !mountedRef.current) return;
            formatMilliseconds(result.createMs); formatMilliseconds(result.updateMs); formatMilliseconds(result.removeMs);
            if (!Number.isInteger(result.remainingRows) || result.remainingRows < 0) throw new RangeError('Remaining rows must be a non-negative integer.');
            model.setSuccess(result);
        } catch (error) {
            if (activeRunIdRef.current !== runId || activeController.signal.aborted || !mountedRef.current || isAbortError(error)) return;
            if (isBenchmarkTimeoutError(error)) {
                model.setFailure({ kind: 'timeout', phase: error.phase });
                console.warn('Render lab phase timed out.', { phase: error.phase, size: model.size.value });
            } else {
                model.setFailure({ kind: 'error' });
                console.error('Render lab scenario failed.', error);
            }
        } finally {
            if (activeRunIdRef.current === runId && !activeController.signal.aborted && mountedRef.current) {
                activeRunIdRef.current = null;
                controllerRef.current = null;
            }
        }
    }

    function updateSize(event: Event): void {
        if (running) return;
        const value = Number((event.currentTarget as HTMLSelectElement).value);
        if (value !== 250 && value !== 1000 && value !== 2000) { model.setInputError('invalid-size'); return; }
        model.setSize(value);
    }
    function reset(): void { if (!running && !strictInitial) model.reset(); }

    const metrics = model.metrics.value;
    return <section data-ft-role='render-lab'>
        <p id={`ft-${nickname}-render-description`} data-ft-role='render-description'>Run one bounded create, update, and remove scenario.</p>
        <p class='ft-showcase-muted' data-ft-role='render-disclaimer'>Results reflect one interaction on this page, device, and build. They are not a scientific cross-framework benchmark.</p>
        <div class='ft-showcase-render-controls' data-ft-role='render-controls'>
            <div class='ft-showcase-field' data-ft-role='render-size-field'><label class='ft-showcase-label' htmlFor={`ft-${nickname}-render-size`}>Row count</label><select id={`ft-${nickname}-render-size`} class='ft-showcase-select' data-ft-role='render-size' value={model.size.value} disabled={running} aria-invalid={model.inputError.value ? true : undefined} aria-errormessage={model.inputError.value ? `ft-${nickname}-render-error` : undefined} onChange={updateSize}><option value={250}>250</option><option value={1000}>1000</option><option value={2000}>2000</option></select></div>
            <button class='ft-showcase-button' data-ft-role='render-run' type='button' disabled={running} onClick={() => void run()}>Run scenario</button>
            <button class='ft-showcase-button' data-ft-role='render-secondary' type='button' disabled={!running && strictInitial} onClick={running ? cancel : reset}>{running ? 'Cancel' : 'Reset'}</button>
            <div data-ft-role='render-error-slot'>{model.inputError.value && <div id={`ft-${nickname}-render-error`} class='ft-showcase-error' role='alert'>Choose a valid row count.</div>}</div>
        </div>
        <div role='status' aria-live='polite' aria-atomic='true' data-ft-role='render-status'>{statusCopy(model.status.value)}</div>
        <dl class='ft-showcase-metrics' data-ft-role='render-metrics'><div class='ft-showcase-metric' data-ft-role='metric-create'><dt>Create</dt><dd>{metrics ? formatMilliseconds(metrics.createMs) : '—'}</dd></div><div class='ft-showcase-metric' data-ft-role='metric-update'><dt>Update every 10th</dt><dd>{metrics ? formatMilliseconds(metrics.updateMs) : '—'}</dd></div><div class='ft-showcase-metric' data-ft-role='metric-remove'><dt>Remove every 7th</dt><dd>{metrics ? formatMilliseconds(metrics.removeMs) : '—'}</dd></div><div class='ft-showcase-metric' data-ft-role='metric-remaining'><dt>Remaining rows</dt><dd>{metrics ? metrics.remainingRows : '—'}</dd></div></dl>
        <table class='ft-showcase-table' data-ft-role='render-table'><thead><tr><th>ID</th><th>Label</th><th>Revision</th></tr></thead><tbody>{model.rows.value.map(row => <tr key={row.id} data-ft-role='render-row'><td>{row.id}</td><td>{row.label}</td><td>{row.revision === 0 ? '0' : '1 · Updated'}</td></tr>)}</tbody></table>
    </section>;
}
