import { describe, expect, it, vi } from 'vitest';
import {
    LIFECYCLE_STAGES,
    LifecycleSequenceError,
    appendLifecycleLog,
    createLifecycleSequenceValidator,
    formatLifecycleResultLog,
    formatLifecycleStageLog,
    isLifecycleSequenceError,
    runLifecycleTask,
} from '../../src/common/components/lifecycle';
import type { LifecycleScheduler, LifecycleStage, LifecycleTaskOptions } from '../../src/common/components/lifecycle';

class FakeScheduler implements LifecycleScheduler {
    nextHandle = 1;
    readonly timers = new Map<ReturnType<typeof setTimeout>, () => void>();
    readonly delays: number[] = [];
    readonly cleared: ReturnType<typeof setTimeout>[] = [];

    setTimer(callback: () => void, ms: number): ReturnType<typeof setTimeout> {
        const handle = this.nextHandle++ as unknown as ReturnType<typeof setTimeout>;
        this.delays.push(ms);
        this.timers.set(handle, callback);
        return handle;
    }

    clearTimer(handle: ReturnType<typeof setTimeout>): void {
        this.cleared.push(handle);
        this.timers.delete(handle);
    }

    fireNext(): void {
        const entry = this.timers.entries().next().value;
        entry?.[1]();
    }
}

async function advance(scheduler: FakeScheduler): Promise<void> {
    scheduler.fireNext();
    await Promise.resolve();
}

describe('lifecycle task contracts', () => {
    it('freezes and emits the only legal sequence using three 250ms waits', async () => {
        const scheduler = new FakeScheduler();
        const stages: Array<[LifecycleStage, number]> = [];
        const promise = runLifecycleTask({
            signal: new AbortController().signal,
            scheduler,
            onStage: (stage, progress) => stages.push([stage, progress]),
        });

        expect(stages).toEqual([['Prepare', 25]]);
        await advance(scheduler);
        await advance(scheduler);
        await advance(scheduler);
        await expect(promise).resolves.toBeUndefined();
        expect(stages).toEqual([
            ['Prepare', 25],
            ['Process', 50],
            ['Finalize', 75],
            ['Complete', 100],
        ]);
        expect(scheduler.delays).toEqual([250, 250, 250]);
        expect(scheduler.timers.size).toBe(0);
        expect(scheduler.cleared).toHaveLength(3);
        expect(Object.isFrozen(LIFECYCLE_STAGES)).toBe(true);
        expect(LIFECYCLE_STAGES.every(Object.isFrozen)).toBe(true);
    });

    it.each([0, 1, 2])('aborts and cleans resources at wait point %i', async completedWaits => {
        const scheduler = new FakeScheduler();
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const promise = runLifecycleTask({ signal: controller.signal, scheduler, onStage: vi.fn() });
        for (let index = 0; index < completedWaits; index += 1) await advance(scheduler);
        controller.abort();

        await expect(promise).rejects.toEqual(expect.objectContaining({ name: 'AbortError' }));
        expect(scheduler.timers.size).toBe(0);
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('preserves scheduler errors and removes the abort listener', async () => {
        const failure = new Error('timer failed');
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const scheduler: LifecycleScheduler = {
            setTimer: () => {
                throw failure;
            },
            clearTimer: vi.fn(),
        };

        await expect(runLifecycleTask({ signal: controller.signal, scheduler, onStage: vi.fn() })).rejects.toBe(failure);
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });

    it('handles a timer callback that fires synchronously and clears its handle', async () => {
        const clearTimer = vi.fn();
        const scheduler: LifecycleScheduler = {
            setTimer: callback => {
                callback();
                return 1 as unknown as ReturnType<typeof setTimeout>;
            },
            clearTimer,
        };
        const stages: string[] = [];
        await runLifecycleTask({ signal: new AbortController().signal, scheduler, onStage: stage => stages.push(stage) });
        expect(stages).toEqual(['Prepare', 'Process', 'Finalize', 'Complete']);
        expect(clearTimer).toHaveBeenCalledTimes(3);
    });

    it('rejects every malformed or incomplete runtime sequence', () => {
        const pairMismatch = createLifecycleSequenceValidator();
        expect(() => pairMismatch.record('Prepare', 50)).toThrow(LifecycleSequenceError);

        const repeated = createLifecycleSequenceValidator();
        repeated.record('Prepare', 25);
        expect(() => repeated.record('Prepare', 25)).toThrow(LifecycleSequenceError);

        const skipped = createLifecycleSequenceValidator();
        expect(() => skipped.record('Process', 50)).toThrow(LifecycleSequenceError);

        const ordered = createLifecycleSequenceValidator();
        for (const fixture of LIFECYCLE_STAGES) ordered.record(fixture.stage, fixture.progress);
        expect(() => ordered.record('Complete', 100)).toThrow(LifecycleSequenceError);

        const earlyResolve = createLifecycleSequenceValidator();
        earlyResolve.record('Prepare', 25);
        expect(() => earlyResolve.assertComplete()).toThrow(LifecycleSequenceError);
        expect(isLifecycleSequenceError(new LifecycleSequenceError())).toBe(true);
        expect(isLifecycleSequenceError(new Error('other'))).toBe(false);
    });

    it('caps and formats logs without mutating the previous list', () => {
        const original = ['Run 1: Prepare.'];
        let log: readonly string[] = original;
        for (let run = 2; run <= 10; run += 1) log = appendLifecycleLog(log, formatLifecycleStageLog(run, 'Prepare'));
        expect(original).toEqual(['Run 1: Prepare.']);
        expect(log).toHaveLength(8);
        expect(log[0]).toBe('Run 3: Prepare.');
        expect(log.at(-1)).toBe('Run 10: Prepare.');
        expect(Object.isFrozen(log)).toBe(true);
        expect(formatLifecycleResultLog(4, 'Canceled')).toBe('Run 4: Canceled.');
        expect(formatLifecycleResultLog(4, 'Failed')).toBe('Run 4: Failed.');
    });

    it('keeps the injectable runner signature framework-neutral', () => {
        const options: LifecycleTaskOptions = { signal: new AbortController().signal, scheduler: new FakeScheduler(), onStage: vi.fn() };
        expect(options.signal.aborted).toBe(false);
    });
});
