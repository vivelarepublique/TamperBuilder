export type LifecycleStep = () => void | Promise<void>;

export interface MainDependencies {
    beforeMount: LifecycleStep;
    mounts: readonly LifecycleStep[];
    afterMount: LifecycleStep;
}

export type MainErrorHandler = (error: unknown) => void;

export async function runMain({ beforeMount, mounts, afterMount }: MainDependencies): Promise<void> {
    await beforeMount();
    for (const mount of mounts) await mount();
    await afterMount();
}

export async function startMain(dependencies: MainDependencies, onError: MainErrorHandler): Promise<void> {
    try {
        await runMain(dependencies);
    } catch (error) {
        onError(error);
    }
}
