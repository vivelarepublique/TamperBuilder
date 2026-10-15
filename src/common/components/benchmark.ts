export type BenchmarkSize = 250 | 1000 | 2000;
export const BENCHMARK_WARMUP_SIZE = 100 as const;
type BenchmarkRowCount = BenchmarkSize | typeof BENCHMARK_WARMUP_SIZE;

export type BenchmarkPhase = 'warmup-create' | 'warmup-update' | 'warmup-remove' | 'warmup-clear' | 'settle' | 'create' | 'update' | 'remove';

export interface BenchmarkRow {
    readonly id: number;
    readonly label: string;
    readonly revision: 0 | 1;
}

export interface BenchmarkMetrics {
    readonly createMs: number;
    readonly updateMs: number;
    readonly removeMs: number;
    readonly remainingRows: number;
}

export interface BenchmarkAdapter {
    replaceRows(rows: readonly BenchmarkRow[]): void;
    updateRows(rows: readonly BenchmarkRow[]): void;
    removeRows(rows: readonly BenchmarkRow[]): void;
    clearRows(rows: readonly BenchmarkRow[]): void;
}

export interface BenchmarkScheduler {
    now(): number;
    requestFrame(callback: FrameRequestCallback): number;
    cancelFrame(handle: number): void;
    setTimer(callback: () => void, ms: number): ReturnType<typeof setTimeout>;
    clearTimer(handle: ReturnType<typeof setTimeout>): void;
}

export interface RenderLabDependencies {
    readonly scheduler: BenchmarkScheduler;
    readonly runScenario: typeof runRenderScenario;
}

export class BenchmarkTimeoutError extends Error {
    readonly name = 'BenchmarkTimeoutError';

    constructor(readonly phase: BenchmarkPhase) {
        super(`Benchmark phase timed out: ${phase}`);
    }
}

export function isBenchmarkTimeoutError(error: unknown): error is BenchmarkTimeoutError {
    return error instanceof BenchmarkTimeoutError;
}

export function isAbortError(error: unknown): error is DOMException {
    return error instanceof DOMException && error.name === 'AbortError';
}

export function createBenchmarkRows(count: BenchmarkRowCount): readonly BenchmarkRow[] {
    return Array.from({ length: count }, (_, index) => ({ id: index + 1, label: `Row ${String(index + 1).padStart(4, '0')}`, revision: 0 }));
}

export function updateEveryTenth(rows: readonly BenchmarkRow[]): readonly BenchmarkRow[] {
    return rows.map(row => (row.id % 10 === 0 ? { ...row, revision: 1 } : row));
}

export function removeEverySeventh(rows: readonly BenchmarkRow[]): readonly BenchmarkRow[] {
    return rows.filter(row => row.id % 7 !== 0);
}

export function formatMilliseconds(value: number): string {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Benchmark duration must be a finite non-negative number.');
    return `${value.toFixed(1)} ms`;
}

const timeoutMilliseconds = 3000;
const aborted = () => new DOMException('Render scenario aborted.', 'AbortError');

type WaitForFrame = () => Promise<void>;

function runPhase<T>(phase: BenchmarkPhase, scheduler: BenchmarkScheduler, signal: AbortSignal, work: (waitForFrame: WaitForFrame) => Promise<T>): Promise<T> {
    if (signal.aborted) return Promise.reject(aborted());
    return new Promise<T>((resolve, reject) => {
        let settled = false;
        const frameHandles = new Set<number>();
        const frameRejectors = new Set<(error: unknown) => void>();

        const cleanup = () => {
            scheduler.clearTimer(timer);
            for (const handle of frameHandles) scheduler.cancelFrame(handle);
            frameHandles.clear();
            signal.removeEventListener('abort', onAbort);
        };
        const finish = (action: () => void) => {
            if (settled) return;
            settled = true;
            cleanup();
            action();
        };
        const fail = (error: unknown) => {
            const rejectors = [...frameRejectors];
            frameRejectors.clear();
            // Adapter and scheduler failures must preserve their original rejection value.
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
            finish(() => reject(error));
            for (const rejectFrame of rejectors) rejectFrame(error);
        };
        const onAbort = () => fail(aborted());
        const waitForFrame: WaitForFrame = () =>
            new Promise<void>((resolveFrame, rejectFrame) => {
                if (signal.aborted) {
                    rejectFrame(aborted());
                    return;
                }
                frameRejectors.add(rejectFrame);
                let handle: number;
                try {
                    handle = scheduler.requestFrame(() => {
                        frameHandles.delete(handle);
                        frameRejectors.delete(rejectFrame);
                        if (signal.aborted) {
                            rejectFrame(aborted());
                            return;
                        }
                        resolveFrame();
                    });
                    frameHandles.add(handle);
                } catch (error) {
                    frameRejectors.delete(rejectFrame);
                    // Scheduler failures must preserve their original rejection value.
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    rejectFrame(error);
                }
            });

        signal.addEventListener('abort', onAbort, { once: true });
        const timer = scheduler.setTimer(() => fail(new BenchmarkTimeoutError(phase)), timeoutMilliseconds);
        void work(waitForFrame).then(
            value => finish(() => resolve(value)),
            error => fail(error),
        );
    });
}

function ensureNotAborted(signal: AbortSignal): void {
    if (signal.aborted) throw aborted();
}

export async function runRenderScenario(options: {
    readonly size: BenchmarkSize;
    readonly adapter: BenchmarkAdapter;
    readonly scheduler: BenchmarkScheduler;
    readonly signal: AbortSignal;
}): Promise<BenchmarkMetrics> {
    const { size, adapter, scheduler, signal } = options;
    ensureNotAborted(signal);
    const prebuiltRows = createBenchmarkRows(size);
    const warmupRows = createBenchmarkRows(BENCHMARK_WARMUP_SIZE);
    const warmupUpdated = updateEveryTenth(warmupRows);
    const warmupRemaining = removeEverySeventh(warmupUpdated);
    const emptyRows: readonly BenchmarkRow[] = Object.freeze([]);

    await runPhase('warmup-create', scheduler, signal, async waitForFrame => {
        ensureNotAborted(signal);
        adapter.replaceRows(warmupRows);
        await waitForFrame();
    });
    await runPhase('warmup-update', scheduler, signal, async waitForFrame => {
        ensureNotAborted(signal);
        adapter.updateRows(warmupUpdated);
        await waitForFrame();
    });
    await runPhase('warmup-remove', scheduler, signal, async waitForFrame => {
        ensureNotAborted(signal);
        adapter.removeRows(warmupRemaining);
        await waitForFrame();
    });
    await runPhase('warmup-clear', scheduler, signal, async waitForFrame => {
        ensureNotAborted(signal);
        adapter.clearRows(emptyRows);
        await waitForFrame();
    });
    await runPhase('settle', scheduler, signal, async waitForFrame => waitForFrame());

    let createStart = 0;
    let createEnd = 0;
    await runPhase('create', scheduler, signal, async waitForFrame => {
        await waitForFrame();
        ensureNotAborted(signal);
        createStart = scheduler.now();
        adapter.replaceRows(prebuiltRows);
        await waitForFrame();
        ensureNotAborted(signal);
        createEnd = scheduler.now();
    });

    const updatedRows = updateEveryTenth(prebuiltRows);
    const remainingRows = removeEverySeventh(updatedRows);
    let updateStart = 0;
    let updateEnd = 0;
    await runPhase('update', scheduler, signal, async waitForFrame => {
        await waitForFrame();
        ensureNotAborted(signal);
        updateStart = scheduler.now();
        adapter.updateRows(updatedRows);
        await waitForFrame();
        ensureNotAborted(signal);
        updateEnd = scheduler.now();
    });

    let removeStart = 0;
    let removeEnd = 0;
    await runPhase('remove', scheduler, signal, async waitForFrame => {
        await waitForFrame();
        ensureNotAborted(signal);
        removeStart = scheduler.now();
        adapter.removeRows(remainingRows);
        await waitForFrame();
        ensureNotAborted(signal);
        removeEnd = scheduler.now();
    });

    return {
        createMs: createEnd - createStart,
        updateMs: updateEnd - updateStart,
        removeMs: removeEnd - removeStart,
        remainingRows: remainingRows.length,
    };
}

export const browserRenderLabDependencies: RenderLabDependencies = {
    scheduler: {
        now: () => performance.now(),
        requestFrame: callback => requestAnimationFrame(callback),
        cancelFrame: handle => cancelAnimationFrame(handle),
        setTimer: (callback, ms) => setTimeout(callback, ms),
        clearTimer: handle => clearTimeout(handle),
    },
    runScenario: runRenderScenario,
};
