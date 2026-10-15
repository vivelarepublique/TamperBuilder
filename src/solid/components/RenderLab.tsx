import { batch, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { formatMilliseconds, isAbortError, isBenchmarkTimeoutError, type BenchmarkMetrics, type BenchmarkPhase, type BenchmarkRow, type BenchmarkSize, type RenderLabDependencies } from '../../common/components/benchmark';

type RenderStatus = { readonly kind: 'idle' } | { readonly kind: 'running'; readonly runId: number } | { readonly kind: 'success' } | { readonly kind: 'startHidden' } | { readonly kind: 'canceled' } | { readonly kind: 'timeout'; readonly phase: BenchmarkPhase } | { readonly kind: 'error' };

export default function RenderLab(props: { readonly nickname: string; readonly dependencies: RenderLabDependencies; readonly registerCancel: (cancel: (() => void) | null) => void }) {
    const [size, setSize] = createSignal<BenchmarkSize>(1000);
    const [rows, setRows] = createSignal<readonly BenchmarkRow[]>([]);
    const [metrics, setMetrics] = createSignal<BenchmarkMetrics | null>(null);
    const [status, setStatus] = createSignal<RenderStatus>({ kind: 'idle' });
    const [inputError, setInputError] = createSignal<null | 'invalid-size'>(null);
    let runSequence = 0;
    let activeRunId: number | null = null;
    let controller: AbortController | null = null;
    let mounted = false;
    const running = createMemo(() => status().kind === 'running');
    const strictInitial = createMemo(() => size() === 1000 && rows().length === 0 && metrics() === null && status().kind === 'idle' && inputError() === null);
    const statusCopy = createMemo(() => { switch (status().kind) { case 'running': return 'Running…'; case 'success': return 'Scenario complete.'; case 'startHidden': return 'Keep this page visible, then try again.'; case 'canceled': return 'Scenario canceled.'; case 'timeout': return 'Scenario timed out. Try again or reset.'; case 'error': return 'Scenario could not complete.'; default: return ''; } });
    function invalidateRun(): void { controller?.abort(); runSequence += 1; activeRunId = null; controller = null; }
    function cancel(): void { if (!running()) return; invalidateRun(); batch(() => { setRows([]); setMetrics(null); setStatus({ kind: 'canceled' }); }); }
    function reset(): void { if (running() || strictInitial()) return; batch(() => { setSize(1000); setRows([]); setMetrics(null); setStatus({ kind: 'idle' }); setInputError(null); }); }
    function updateSize(event: Event): void { if (running()) return; const value = Number((event.currentTarget as HTMLSelectElement).value); if (value !== 250 && value !== 1000 && value !== 2000) { setInputError('invalid-size'); return; } batch(() => { setSize(value); setInputError(null); }); }
    async function run(): Promise<void> {
        if (running()) return;
        setInputError(null);
        if (document.hidden) { setStatus({ kind: 'startHidden' }); return; }
        const runId = ++runSequence; activeRunId = runId;
        const activeController = new AbortController(); controller = activeController;
        batch(() => { setRows([]); setMetrics(null); setStatus({ kind: 'running', runId }); });
        try {
            const commitRows = (nextRows: readonly BenchmarkRow[]) => {
                if (activeRunId === runId && !activeController.signal.aborted && mounted) setRows(nextRows);
            };
            const adapter = { replaceRows: commitRows, updateRows: commitRows, removeRows: commitRows, clearRows: commitRows };
            const result = await props.dependencies.runScenario({ size: size(), adapter, scheduler: props.dependencies.scheduler, signal: activeController.signal });
            if (activeRunId !== runId || activeController.signal.aborted || !mounted) return;
            formatMilliseconds(result.createMs); formatMilliseconds(result.updateMs); formatMilliseconds(result.removeMs);
            if (!Number.isInteger(result.remainingRows) || result.remainingRows < 0) throw new RangeError('Remaining rows must be a non-negative integer.');
            batch(() => { setMetrics(result); setStatus({ kind: 'success' }); });
        } catch (error) {
            if (activeRunId !== runId || activeController.signal.aborted || !mounted || isAbortError(error)) return;
            batch(() => { setRows([]); setMetrics(null); });
            if (isBenchmarkTimeoutError(error)) { setStatus({ kind: 'timeout', phase: error.phase }); console.warn('Render lab phase timed out.', { phase: error.phase, size: size() }); }
            else { setStatus({ kind: 'error' }); console.error('Render lab scenario failed.', error); }
        } finally { if (activeRunId === runId && !activeController.signal.aborted && mounted) { activeRunId = null; controller = null; } }
    }
    onMount(() => { mounted = true; props.registerCancel(() => { if (activeRunId !== null) invalidateRun(); }); const listener = () => { if (document.hidden && running()) cancel(); }; document.addEventListener('visibilitychange', listener); onCleanup(() => { document.removeEventListener('visibilitychange', listener); props.registerCancel(null); }); });
    onCleanup(() => { mounted = false; invalidateRun(); });

    return <section data-ft-role='render-lab'><p id={`ft-${props.nickname}-render-description`} data-ft-role='render-description'>Run one bounded create, update, and remove scenario.</p><p class='ft-showcase-muted' data-ft-role='render-disclaimer'>Results reflect one interaction on this page, device, and build. They are not a scientific cross-framework benchmark.</p>
        <div class='ft-showcase-render-controls' data-ft-role='render-controls'><div class='ft-showcase-field' data-ft-role='render-size-field'><label class='ft-showcase-label' for={`ft-${props.nickname}-render-size`}>Row count</label><select id={`ft-${props.nickname}-render-size`} class='ft-showcase-select' data-ft-role='render-size' value={size()} disabled={running()} aria-invalid={inputError() ? 'true' : undefined} aria-errormessage={inputError() ? `ft-${props.nickname}-render-error` : undefined} onChange={updateSize}><option value={250}>250</option><option value={1000}>1000</option><option value={2000}>2000</option></select></div><button class='ft-showcase-button' data-ft-role='render-run' type='button' disabled={running()} onClick={() => void run()}>Run scenario</button><button class='ft-showcase-button' data-ft-role='render-secondary' type='button' disabled={!running() && strictInitial()} onClick={() => running() ? cancel() : reset()}>{running() ? 'Cancel' : 'Reset'}</button><div data-ft-role='render-error-slot'><Show when={inputError() !== null}><div id={`ft-${props.nickname}-render-error`} class='ft-showcase-error' role='alert'>Choose a valid row count.</div></Show></div></div>
        <div role='status' aria-live='polite' aria-atomic='true' data-ft-role='render-status'>{statusCopy()}</div><dl class='ft-showcase-metrics' data-ft-role='render-metrics'><div class='ft-showcase-metric' data-ft-role='metric-create'><dt>Create</dt><dd>{metrics() ? formatMilliseconds(metrics()!.createMs) : '—'}</dd></div><div class='ft-showcase-metric' data-ft-role='metric-update'><dt>Update every 10th</dt><dd>{metrics() ? formatMilliseconds(metrics()!.updateMs) : '—'}</dd></div><div class='ft-showcase-metric' data-ft-role='metric-remove'><dt>Remove every 7th</dt><dd>{metrics() ? formatMilliseconds(metrics()!.removeMs) : '—'}</dd></div><div class='ft-showcase-metric' data-ft-role='metric-remaining'><dt>Remaining rows</dt><dd>{metrics() ? metrics()!.remainingRows : '—'}</dd></div></dl>
        <table class='ft-showcase-table' data-ft-role='render-table'><thead><tr><th>ID</th><th>Label</th><th>Revision</th></tr></thead><tbody><For each={rows()}>{row => <tr data-ft-role='render-row'><td>{row.id}</td><td>{row.label}</td><td>{row.revision === 0 ? '0' : '1 · Updated'}</td></tr>}</For></tbody></table>
    </section>;
}
