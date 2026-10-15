export type LifecycleStage = 'Prepare' | 'Process' | 'Finalize' | 'Complete';
export type LifecycleProgress = 25 | 50 | 75 | 100;

export interface LifecycleStageFixture {
    readonly stage: LifecycleStage;
    readonly progress: LifecycleProgress;
}

export const LIFECYCLE_STAGES: readonly Readonly<LifecycleStageFixture>[] = Object.freeze([
    Object.freeze({ stage: 'Prepare', progress: 25 }),
    Object.freeze({ stage: 'Process', progress: 50 }),
    Object.freeze({ stage: 'Finalize', progress: 75 }),
    Object.freeze({ stage: 'Complete', progress: 100 }),
]);

export const LIFECYCLE_DESCRIPTION = 'Run one deterministic cancellable task through component lifecycle stages.';
export const LIFECYCLE_LOG_LIMIT = 8;

export interface LifecycleScheduler {
    setTimer(callback: () => void, ms: number): ReturnType<typeof setTimeout>;
    clearTimer(handle: ReturnType<typeof setTimeout>): void;
}

export interface LifecycleTaskOptions {
    readonly signal: AbortSignal;
    readonly scheduler: LifecycleScheduler;
    readonly onStage: (stage: LifecycleStage, progress: LifecycleProgress) => void;
}

export interface LifecycleLabDependencies {
    readonly scheduler: LifecycleScheduler;
    readonly runTask: (options: LifecycleTaskOptions) => Promise<void>;
}

export interface LifecycleSequenceValidator {
    record(stage: LifecycleStage, progress: LifecycleProgress): void;
    assertComplete(): void;
}

export class LifecycleSequenceError extends Error {
    readonly name = 'LifecycleSequenceError';

    constructor() {
        super('Lifecycle task emitted an invalid stage sequence.');
    }
}

export function isLifecycleSequenceError(error: unknown): error is LifecycleSequenceError {
    return error instanceof LifecycleSequenceError;
}

export function createLifecycleSequenceValidator(): LifecycleSequenceValidator {
    let nextIndex = 0;
    return {
        record(stage, progress) {
            const expected = LIFECYCLE_STAGES[nextIndex];
            if (expected === undefined || stage !== expected.stage || progress !== expected.progress) throw new LifecycleSequenceError();
            nextIndex += 1;
        },
        assertComplete() {
            if (nextIndex !== LIFECYCLE_STAGES.length) throw new LifecycleSequenceError();
        },
    };
}

export function appendLifecycleLog(log: readonly string[], entry: string): readonly string[] {
    return Object.freeze([...log, entry].slice(-LIFECYCLE_LOG_LIMIT));
}

export function formatLifecycleStageLog(run: number, stage: LifecycleStage): string {
    return `Run ${run}: ${stage}.`;
}

export function formatLifecycleResultLog(run: number, result: 'Canceled' | 'Failed'): string {
    return `Run ${run}: ${result}.`;
}

function abortError(): DOMException {
    return new DOMException('Lifecycle task aborted.', 'AbortError');
}

function waitForStage(signal: AbortSignal, scheduler: LifecycleScheduler): Promise<void> {
    if (signal.aborted) return Promise.reject(abortError());

    return new Promise<void>((resolve, reject) => {
        let settled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const cleanup = () => {
            signal.removeEventListener('abort', onAbort);
            if (timer !== null) {
                const handle = timer;
                timer = null;
                scheduler.clearTimer(handle);
            }
        };
        const finish = (action: () => void) => {
            if (settled) return;
            settled = true;
            try {
                cleanup();
                action();
            } catch (error) {
                // Scheduler failures must preserve their original rejection value.
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(error);
            }
        };
        const onAbort = () => finish(() => reject(abortError()));

        signal.addEventListener('abort', onAbort, { once: true });
        if (signal.aborted) {
            onAbort();
            return;
        }

        try {
            const createdTimer = scheduler.setTimer(() => finish(resolve), 250);
            if (settled) scheduler.clearTimer(createdTimer);
            else timer = createdTimer;
        } catch (error) {
            finish(() => {
                // Scheduler failures must preserve their original rejection value.
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(error);
            });
        }
    });
}

export async function runLifecycleTask(options: LifecycleTaskOptions): Promise<void> {
    if (options.signal.aborted) throw abortError();
    const first = LIFECYCLE_STAGES[0];
    if (first === undefined) return;
    options.onStage(first.stage, first.progress);

    for (const fixture of LIFECYCLE_STAGES.slice(1)) {
        await waitForStage(options.signal, options.scheduler);
        if (options.signal.aborted) throw abortError();
        options.onStage(fixture.stage, fixture.progress);
    }
}

const browserLifecycleScheduler: LifecycleScheduler = Object.freeze({
    setTimer: (callback: () => void, ms: number) => setTimeout(callback, ms),
    clearTimer: (handle: ReturnType<typeof setTimeout>) => clearTimeout(handle),
});

export const browserLifecycleLabDependencies: LifecycleLabDependencies = Object.freeze({
    scheduler: browserLifecycleScheduler,
    runTask: runLifecycleTask,
});
