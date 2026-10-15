export type CompositionStatus = 'Ready' | 'Updated';

export const COMPOSITION_COPY = Object.freeze({
    description: 'Compose one preview card from projected content and local actions.',
    title: 'Deployment preview',
    body: 'Preview the next Component Lab release.',
    environmentLabel: 'Environment',
    environmentValue: 'Preview',
    changeLabel: 'Change',
    changeValue: 'Five-tab component lab',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    runAction: 'Run preview action',
    reset: 'Reset',
    initialStatus: 'No preview actions yet.',
});

export interface CompositionFixture {
    readonly expanded: boolean;
    readonly actionCount: number;
    readonly status: CompositionStatus;
}

export const INITIAL_COMPOSITION_FIXTURE: Readonly<CompositionFixture> = Object.freeze({
    expanded: false,
    actionCount: 0,
    status: 'Ready',
});
