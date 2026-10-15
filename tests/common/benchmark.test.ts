import { describe, expect, it, vi } from 'vitest';
import {
    BenchmarkTimeoutError,
    createBenchmarkRows,
    formatMilliseconds,
    isAbortError,
    isBenchmarkTimeoutError,
    removeEverySeventh,
    runRenderScenario,
    updateEveryTenth,
} from '../../src/common/components/benchmark';
import type { BenchmarkAdapter, BenchmarkPhase, BenchmarkRow, BenchmarkScheduler, BenchmarkSize } from '../../src/common/components/benchmark';

const phases: readonly BenchmarkPhase[] = ['warmup-create', 'warmup-update', 'warmup-remove', 'warmup-clear', 'settle', 'create', 'update', 'remove'];

class FakeScheduler implements BenchmarkScheduler {
    time = 0;
    nextHandle = 1;
    phaseIndex = 0;
    readonly frames = new Map<number, FrameRequestCallback>();
    readonly timers = new Map<ReturnType<typeof setTimeout>, () => void>();
    readonly canceledFrames: number[] = [];
    readonly clearedTimers: ReturnType<typeof setTimeout>[] = [];

    constructor(private readonly timeoutPhase?: BenchmarkPhase, private readonly automaticFrames = true) {}

    now(): number {
        return this.time;
    }

    requestFrame(callback: FrameRequestCallback): number {
        const handle = this.nextHandle++;
        this.frames.set(handle, callback);
        if (this.automaticFrames) queueMicrotask(() => this.fireFrame(handle));
        return handle;
    }

    cancelFrame(handle: number): void {
        this.canceledFrames.push(handle);
        this.frames.delete(handle);
    }

    setTimer(callback: () => void): ReturnType<typeof setTimeout> {
        const handle = this.nextHandle++ as unknown as ReturnType<typeof setTimeout>;
        this.timers.set(handle, callback);
        const phase = phases[this.phaseIndex++];
        if (phase === this.timeoutPhase) queueMicrotask(() => this.fireTimer(handle));
        return handle;
    }

    clearTimer(handle: ReturnType<typeof setTimeout>): void {
        this.clearedTimers.push(handle);
        this.timers.delete(handle);
    }

    fireFrame(handle: number): void {
        const callback = this.frames.get(handle);
        if (callback === undefined) return;
        this.frames.delete(handle);
        this.time += 1;
        callback(this.time);
    }

    fireTimer(handle: ReturnType<typeof setTimeout>): void {
        const callback = this.timers.get(handle);
        if (callback === undefined) return;
        this.timers.delete(handle);
        callback();
    }
}

interface RecordingCall {
    readonly method: keyof BenchmarkAdapter;
    readonly rows: readonly BenchmarkRow[];
}

function createRecordingAdapter(): { adapter: BenchmarkAdapter; calls: RecordingCall[] } {
    const calls: RecordingCall[] = [];
    const record = (method: keyof BenchmarkAdapter) => (rows: readonly BenchmarkRow[]) => calls.push({ method, rows });
    return {
        adapter: {
            replaceRows: record('replaceRows'),
            updateRows: record('updateRows'),
            removeRows: record('removeRows'),
            clearRows: record('clearRows'),
        },
        calls,
    };
}

function serialize(calls: readonly RecordingCall[]) {
    return calls.map(call => ({ method: call.method, rows: call.rows.map(row => [row.id, row.revision]) }));
}

describe('deterministic render scenario', () => {
    it('creates, updates and removes stable rows', () => {
        const rows = createBenchmarkRows(250);
        expect(rows[0]).toEqual({ id: 1, label: 'Row 0001', revision: 0 });
        expect(rows.at(-1)).toEqual({ id: 250, label: 'Row 0250', revision: 0 });
        const updated = updateEveryTenth(rows);
        expect(updated.filter(row => row.revision === 1).map(row => row.id)).toEqual(Array.from({ length: 25 }, (_, index) => (index + 1) * 10));
        expect(removeEverySeventh(updated).map(row => row.id)).not.toContain(7);
        expect(rows.every(row => row.revision === 0)).toBe(true);
    });

    it.each([
        [250, 215],
        [1000, 858],
        [2000, 1715],
    ] as const)('returns the exact final count for %i rows', async (size, remainingRows) => {
        const scheduler = new FakeScheduler();
        const { adapter, calls } = createRecordingAdapter();
        await expect(runRenderScenario({ size, adapter, scheduler, signal: new AbortController().signal })).resolves.toEqual({
            createMs: 1,
            updateMs: 1,
            removeMs: 1,
            remainingRows,
        });
        expect(calls.map(call => call.method)).toEqual([
            'replaceRows',
            'updateRows',
            'removeRows',
            'clearRows',
            'replaceRows',
            'updateRows',
            'removeRows',
        ]);
        expect(calls[0]?.rows).toHaveLength(100);
        expect(calls[3]?.rows).toEqual([]);
        expect(scheduler.phaseIndex).toBe(8);
        expect(scheduler.timers).toHaveProperty('size', 0);
        expect(scheduler.frames).toHaveProperty('size', 0);
    });

    it('delivers identical payloads to six independent adapters', async () => {
        const recordings: ReturnType<typeof serialize>[] = [];
        for (let index = 0; index < 6; index += 1) {
            const { adapter, calls } = createRecordingAdapter();
            await runRenderScenario({ size: 1000, adapter, scheduler: new FakeScheduler(), signal: new AbortController().signal });
            recordings.push(serialize(calls));
        }
        expect(recordings.slice(1).every(recording => JSON.stringify(recording) === JSON.stringify(recordings[0]))).toBe(true);
    });

    it.each(phases)('times out and cleans pending work in phase %s', async phase => {
        const scheduler = new FakeScheduler(phase);
        const { adapter } = createRecordingAdapter();
        const promise = runRenderScenario({ size: 250, adapter, scheduler, signal: new AbortController().signal });
        await expect(promise).rejects.toEqual(expect.objectContaining({ name: 'BenchmarkTimeoutError', phase }));
        expect(scheduler.frames.size).toBe(0);
        expect(scheduler.timers.size).toBe(0);
        expect(scheduler.canceledFrames.length).toBeGreaterThan(0);
    });

    it('rejects AbortError and clears a pending frame and timer', async () => {
        const scheduler = new FakeScheduler(undefined, false);
        const controller = new AbortController();
        const { adapter } = createRecordingAdapter();
        const promise = runRenderScenario({ size: 250, adapter, scheduler, signal: controller.signal });
        controller.abort();
        const error = await promise.catch((reason: unknown) => reason);
        expect(isAbortError(error)).toBe(true);
        expect(scheduler.frames.size).toBe(0);
        expect(scheduler.timers.size).toBe(0);
        expect(scheduler.canceledFrames).toHaveLength(1);
    });

    it('preserves adapter failures and cleans scheduler resources', async () => {
        const scheduler = new FakeScheduler();
        const failure = new Error('adapter failed');
        const adapter: BenchmarkAdapter = {
            replaceRows: vi.fn(() => {
                throw failure;
            }),
            updateRows: vi.fn(),
            removeRows: vi.fn(),
            clearRows: vi.fn(),
        };
        await expect(runRenderScenario({ size: 250, adapter, scheduler, signal: new AbortController().signal })).rejects.toBe(failure);
        expect(scheduler.frames.size).toBe(0);
        expect(scheduler.timers.size).toBe(0);
    });

    it('cleans the abort listener when timer setup throws', async () => {
        const failure = new Error('timer setup failed');
        const scheduler = new FakeScheduler();
        scheduler.setTimer = () => { throw failure; };
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const { adapter } = createRecordingAdapter();

        await expect(runRenderScenario({ size: 250, adapter, scheduler, signal: controller.signal })).rejects.toBe(failure);
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
        expect(scheduler.frames.size).toBe(0);
        expect(scheduler.timers.size).toBe(0);
    });

    it('handles a timer callback that fires synchronously during setup', async () => {
        const scheduler = new FakeScheduler();
        scheduler.setTimer = callback => {
            callback();
            return 1 as unknown as ReturnType<typeof setTimeout>;
        };
        const { adapter, calls } = createRecordingAdapter();

        await expect(runRenderScenario({ size: 250, adapter, scheduler, signal: new AbortController().signal })).rejects.toEqual(
            expect.objectContaining({ name: 'BenchmarkTimeoutError', phase: 'warmup-create' }),
        );
        expect(calls).toEqual([]);
        expect(scheduler.clearedTimers).toHaveLength(1);
        expect(scheduler.frames.size).toBe(0);
    });

    it('handles a frame callback that fires synchronously during setup', async () => {
        const scheduler = new FakeScheduler();
        scheduler.requestFrame = callback => {
            scheduler.time += 1;
            callback(scheduler.time);
            return scheduler.nextHandle++;
        };
        const { adapter } = createRecordingAdapter();

        await expect(runRenderScenario({ size: 250, adapter, scheduler, signal: new AbortController().signal })).resolves.toEqual({
            createMs: 1,
            updateMs: 1,
            removeMs: 1,
            remainingRows: 215,
        });
        expect(scheduler.frames.size).toBe(0);
        expect(scheduler.timers.size).toBe(0);
    });

    it('formats invariant durations and identifies timeout errors', () => {
        expect(formatMilliseconds(0)).toBe('0.0 ms');
        expect(formatMilliseconds(1.25)).toBe('1.3 ms');
        expect(() => formatMilliseconds(Number.NaN)).toThrow(RangeError);
        expect(() => formatMilliseconds(Number.POSITIVE_INFINITY)).toThrow(RangeError);
        expect(() => formatMilliseconds(-1)).toThrow(RangeError);
        expect(isBenchmarkTimeoutError(new BenchmarkTimeoutError('settle'))).toBe(true);
        expect(isBenchmarkTimeoutError(new Error('other'))).toBe(false);
    });

    it('accepts only public benchmark sizes at the type boundary', () => {
        const values: BenchmarkSize[] = [250, 1000, 2000];
        expect(values).toEqual([250, 1000, 2000]);
    });
});
