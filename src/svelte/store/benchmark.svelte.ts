import type { BenchmarkMetrics, BenchmarkPhase, BenchmarkRow, BenchmarkSize } from '../../common/components/benchmark';

export type RenderStatus = { readonly kind: 'idle' } | { readonly kind: 'running'; readonly runId: number } | { readonly kind: 'success' } | { readonly kind: 'startHidden' } | { readonly kind: 'canceled' } | { readonly kind: 'timeout'; readonly phase: BenchmarkPhase } | { readonly kind: 'error' };

export function createBenchmarkModel() {
    let size = $state<BenchmarkSize>(1000);
    let rows = $state<readonly BenchmarkRow[]>([]);
    let metrics = $state<BenchmarkMetrics | null>(null);
    let status = $state<RenderStatus>({ kind: 'idle' });
    let inputError = $state<null | 'invalid-size'>(null);
    return {
        get size() { return size; }, setSize(value: BenchmarkSize) { size = value; inputError = null; },
        get rows() { return rows; }, setRows(value: readonly BenchmarkRow[]) { rows = value; },
        get metrics() { return metrics; }, setMetrics(value: BenchmarkMetrics | null) { metrics = value; },
        get status() { return status; }, setStatus(value: RenderStatus) { status = value; },
        get inputError() { return inputError; }, setInputError(value: null | 'invalid-size') { inputError = value; },
        clearResult() { rows = []; metrics = null; },
        reset() { size = 1000; rows = []; metrics = null; status = { kind: 'idle' }; inputError = null; },
    };
}
