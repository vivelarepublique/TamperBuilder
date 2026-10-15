import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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

type RenderStatus =
    | { readonly kind: 'idle' }
    | { readonly kind: 'running'; readonly runId: number }
    | { readonly kind: 'success' }
    | { readonly kind: 'startHidden' }
    | { readonly kind: 'canceled' }
    | { readonly kind: 'timeout'; readonly phase: BenchmarkPhase }
    | { readonly kind: 'error' };

function getStatusCopy(status: RenderStatus): string {
    switch (status.kind) {
        case 'running': return 'Running…';
        case 'success': return 'Scenario complete.';
        case 'startHidden': return 'Keep this page visible, then try again.';
        case 'canceled': return 'Scenario canceled.';
        case 'timeout': return 'Scenario timed out. Try again or reset.';
        case 'error': return 'Scenario could not complete.';
        default: return '';
    }
}

export interface RenderLabHandle {
    cancelActiveRun(): void;
}

const RenderLab = forwardRef<RenderLabHandle, { readonly nickname: string; readonly dependencies: RenderLabDependencies }>(function RenderLab({ nickname, dependencies }, ref) {
    const [size, setSize] = useState<BenchmarkSize>(1000);
    const [rows, setRows] = useState<readonly BenchmarkRow[]>([]);
    const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
    const [status, setStatus] = useState<RenderStatus>({ kind: 'idle' });
    const [inputError, setInputError] = useState<null | 'invalid-size'>(null);
    const runSequence = useRef(0);
    const activeRunId = useRef<number | null>(null);
    const controller = useRef<AbortController | null>(null);
    const mounted = useRef(true);
    const running = status.kind === 'running';
    const strictInitial = size === 1000 && rows.length === 0 && metrics === null && status.kind === 'idle' && inputError === null;
    const invalidateRun = useCallback(() => {
        controller.current?.abort();
        runSequence.current += 1;
        activeRunId.current = null;
        controller.current = null;
    }, []);

    const cancel = useCallback(() => {
        if (activeRunId.current === null) return;
        invalidateRun();
        setRows([]);
        setMetrics(null);
        setStatus({ kind: 'canceled' });
    }, [invalidateRun]);

    useImperativeHandle(ref, () => ({
        cancelActiveRun() {
            if (activeRunId.current !== null) invalidateRun();
        },
    }), [invalidateRun]);

    useEffect(() => {
        mounted.current = true;
        const visibilityHandler = () => {
            if (document.hidden && activeRunId.current !== null) cancel();
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        return () => {
            mounted.current = false;
            invalidateRun();
            document.removeEventListener('visibilitychange', visibilityHandler);
        };
    }, [cancel, invalidateRun]);

    async function run(): Promise<void> {
        if (activeRunId.current !== null) return;
        setInputError(null);
        if (document.hidden) {
            setStatus({ kind: 'startHidden' });
            return;
        }
        const runId = ++runSequence.current;
        activeRunId.current = runId;
        const activeController = new AbortController();
        controller.current = activeController;
        setRows([]);
        setMetrics(null);
        setStatus({ kind: 'running', runId });
        try {
            const commitRows = (nextRows: readonly BenchmarkRow[]) => {
                if (activeRunId.current === runId && !activeController.signal.aborted && mounted.current) setRows(nextRows);
            };
            const adapter = { replaceRows: commitRows, updateRows: commitRows, removeRows: commitRows, clearRows: commitRows };
            const result = await dependencies.runScenario({ size, adapter, scheduler: dependencies.scheduler, signal: activeController.signal });
            if (activeRunId.current !== runId || activeController.signal.aborted || !mounted.current) return;
            formatMilliseconds(result.createMs);
            formatMilliseconds(result.updateMs);
            formatMilliseconds(result.removeMs);
            if (!Number.isInteger(result.remainingRows) || result.remainingRows < 0) throw new RangeError('Remaining rows must be a non-negative integer.');
            setMetrics(result);
            setStatus({ kind: 'success' });
        } catch (error) {
            if (activeRunId.current !== runId || activeController.signal.aborted || !mounted.current || isAbortError(error)) return;
            setRows([]);
            setMetrics(null);
            if (isBenchmarkTimeoutError(error)) {
                setStatus({ kind: 'timeout', phase: error.phase });
                console.warn('Render lab phase timed out.', { phase: error.phase, size });
            } else {
                setStatus({ kind: 'error' });
                console.error('Render lab scenario failed.', error);
            }
        } finally {
            if (activeRunId.current === runId && !activeController.signal.aborted && mounted.current) {
                activeRunId.current = null;
                controller.current = null;
            }
        }
    }

    function updateSize(event: React.ChangeEvent<HTMLSelectElement>): void {
        if (running) return;
        const value = Number(event.currentTarget.value);
        if (value !== 250 && value !== 1000 && value !== 2000) {
            setInputError('invalid-size');
            return;
        }
        setSize(value);
        setInputError(null);
    }

    function reset(): void {
        if (running || strictInitial) return;
        setSize(1000);
        setRows([]);
        setMetrics(null);
        setStatus({ kind: 'idle' });
        setInputError(null);
    }

    return (
        <section data-ft-role='render-lab'>
            <p id={`ft-${nickname}-render-description`} data-ft-role='render-description'>Run one bounded create, update, and remove scenario.</p>
            <p className='ft-showcase-muted' data-ft-role='render-disclaimer'>Results reflect one interaction on this page, device, and build. They are not a scientific cross-framework benchmark.</p>
            <div className='ft-showcase-render-controls' data-ft-role='render-controls'>
                <div className='ft-showcase-field' data-ft-role='render-size-field'>
                    <label className='ft-showcase-label' htmlFor={`ft-${nickname}-render-size`}>Row count</label>
                    <select id={`ft-${nickname}-render-size`} className='ft-showcase-select' data-ft-role='render-size' value={size} disabled={running} aria-invalid={inputError ? true : undefined} aria-errormessage={inputError ? `ft-${nickname}-render-error` : undefined} onChange={updateSize}>
                        <option value={250}>250</option><option value={1000}>1000</option><option value={2000}>2000</option>
                    </select>
                </div>
                <button className='ft-showcase-button' data-ft-role='render-run' type='button' disabled={running} onClick={() => void run()}>Run scenario</button>
                <button className='ft-showcase-button' data-ft-role='render-secondary' type='button' disabled={!running && strictInitial} onClick={running ? cancel : reset}>{running ? 'Cancel' : 'Reset'}</button>
                <div data-ft-role='render-error-slot'>{inputError && <div id={`ft-${nickname}-render-error`} className='ft-showcase-error' role='alert'>Choose a valid row count.</div>}</div>
            </div>
            <div role='status' aria-live='polite' aria-atomic='true' data-ft-role='render-status'>{getStatusCopy(status)}</div>
            <dl className='ft-showcase-metrics' data-ft-role='render-metrics'>
                <div className='ft-showcase-metric' data-ft-role='metric-create'><dt>Create</dt><dd>{metrics ? formatMilliseconds(metrics.createMs) : '—'}</dd></div>
                <div className='ft-showcase-metric' data-ft-role='metric-update'><dt>Update every 10th</dt><dd>{metrics ? formatMilliseconds(metrics.updateMs) : '—'}</dd></div>
                <div className='ft-showcase-metric' data-ft-role='metric-remove'><dt>Remove every 7th</dt><dd>{metrics ? formatMilliseconds(metrics.removeMs) : '—'}</dd></div>
                <div className='ft-showcase-metric' data-ft-role='metric-remaining'><dt>Remaining rows</dt><dd>{metrics ? metrics.remainingRows : '—'}</dd></div>
            </dl>
            <table className='ft-showcase-table' data-ft-role='render-table'>
                <thead><tr><th>ID</th><th>Label</th><th>Revision</th></tr></thead>
                <tbody>{rows.map(row => <tr key={row.id} data-ft-role='render-row'><td>{row.id}</td><td>{row.label}</td><td>{row.revision === 0 ? '0' : '1 · Updated'}</td></tr>)}</tbody>
            </table>
        </section>
    );
});

export default RenderLab;
