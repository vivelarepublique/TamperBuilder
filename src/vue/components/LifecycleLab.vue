<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import {
        LIFECYCLE_DESCRIPTION,
        appendLifecycleLog,
        createLifecycleSequenceValidator,
        formatLifecycleResultLog,
        formatLifecycleStageLog,
        type LifecycleLabDependencies,
        type LifecycleProgress,
        type LifecycleStage,
    } from '../../common/components/lifecycle';

    type LifecycleRunState =
        | { readonly kind: 'idle' }
        | { readonly kind: 'running'; readonly runId: number }
        | { readonly kind: 'canceled' | 'completed' | 'error' };

    const props = defineProps<{ nickname: string; dependencies: LifecycleLabDependencies }>();
    const runState = ref<LifecycleRunState>({ kind: 'idle' });
    const currentStage = ref<LifecycleStage | null>(null);
    const progress = ref<0 | LifecycleProgress>(0);
    const runsCompleted = ref(0);
    const log = ref<readonly string[]>([]);
    const statusCopy = computed(() => {
        switch (runState.value.kind) {
            case 'idle': return 'Ready to start.';
            case 'running': return 'Task is running.';
            case 'canceled': return 'Task canceled. Restart or reset.';
            case 'completed': return 'Task completed.';
            case 'error': return 'Task could not complete. Restart or reset.';
            default: return '';
        }
    });
    let runSequence = 0;
    let activeRunId: number | null = null;
    let activeController: AbortController | null = null;
    let mounted = false;

    function isActiveRun(runId: number, controller: AbortController): boolean {
        return mounted && activeRunId === runId && activeController === controller && !controller.signal.aborted;
    }

    function invalidateActiveRun(): void {
        const controller = activeController;
        activeRunId = null;
        activeController = null;
        controller?.abort();
    }

    function failRun(runId: number, controller: AbortController, error: unknown): void {
        if (!isActiveRun(runId, controller)) return;
        activeRunId = null;
        activeController = null;
        controller.abort();
        runState.value = { kind: 'error' };
        log.value = appendLifecycleLog(log.value, formatLifecycleResultLog(runId, 'Failed'));
        console.error('Lifecycle lab task failed.', error);
    }

    async function executeRun(runId: number, controller: AbortController): Promise<void> {
        const validator = createLifecycleSequenceValidator();
        try {
            await props.dependencies.runTask({
                signal: controller.signal,
                scheduler: props.dependencies.scheduler,
                onStage(stage, nextProgress) {
                    if (!isActiveRun(runId, controller)) return;
                    try {
                        validator.record(stage, nextProgress);
                    } catch (error) {
                        failRun(runId, controller, error);
                        throw error;
                    }
                    if (!isActiveRun(runId, controller)) return;
                    currentStage.value = stage;
                    progress.value = nextProgress;
                    log.value = appendLifecycleLog(log.value, formatLifecycleStageLog(runId, stage));
                },
            });
            if (!isActiveRun(runId, controller)) return;
            validator.assertComplete();
            if (!isActiveRun(runId, controller)) return;
            activeRunId = null;
            activeController = null;
            runsCompleted.value += 1;
            runState.value = { kind: 'completed' };
        } catch (error) {
            failRun(runId, controller, error);
        }
    }

    function beginRun(): void {
        if (!mounted) return;
        invalidateActiveRun();
        const runId = ++runSequence;
        const controller = new AbortController();
        activeRunId = runId;
        activeController = controller;
        currentStage.value = null;
        progress.value = 0;
        runState.value = { kind: 'running', runId };
        void executeRun(runId, controller);
    }

    function start(): void {
        if (runState.value.kind === 'idle') beginRun();
    }

    function secondary(): void {
        if (runState.value.kind === 'running') {
            const runId = runState.value.runId;
            invalidateActiveRun();
            runState.value = { kind: 'canceled' };
            log.value = appendLifecycleLog(log.value, formatLifecycleResultLog(runId, 'Canceled'));
        } else if (runState.value.kind !== 'idle') {
            beginRun();
        }
    }

    function reset(): void {
        if (runState.value.kind === 'idle') return;
        invalidateActiveRun();
        runState.value = { kind: 'idle' };
        currentStage.value = null;
        progress.value = 0;
        runsCompleted.value = 0;
        log.value = [];
    }

    function deactivate(): void {
        mounted = false;
        invalidateActiveRun();
    }

    defineExpose({ deactivate });
    onMounted(() => { mounted = true; });
    onBeforeUnmount(deactivate);
</script>

<template>
    <section data-ft-role="lifecycle-lab">
        <p :id="`ft-${nickname}-lifecycle-description`" data-ft-role="lifecycle-description">{{ LIFECYCLE_DESCRIPTION }}</p>
        <dl class="ft-showcase-lifecycle-summary" data-ft-role="lifecycle-summary">
            <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-current-stage"><dt>Current stage</dt><dd>{{ currentStage ?? 'Not started' }}</dd></div>
            <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-progress-summary"><dt>Progress</dt><dd>{{ progress }}%</dd></div>
            <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-runs-completed"><dt>Runs completed</dt><dd>{{ runsCompleted }}</dd></div>
            <div class="ft-showcase-lifecycle-item" data-ft-role="lifecycle-status"><dt>Status</dt><dd>{{ statusCopy }}</dd></div>
        </dl>
        <progress class="ft-showcase-lifecycle-progress" data-ft-role="lifecycle-progress" :value="progress" max="100" aria-label="Lifecycle progress" />
        <div class="ft-showcase-lifecycle-actions" data-ft-role="lifecycle-actions">
            <button class="ft-showcase-button" data-ft-role="lifecycle-start" type="button" :disabled="runState.kind !== 'idle'" @click="start">Start</button>
            <button class="ft-showcase-button" data-ft-role="lifecycle-secondary" type="button" :disabled="runState.kind === 'idle'" @click="secondary">{{ runState.kind === 'running' ? 'Cancel' : 'Restart' }}</button>
            <button class="ft-showcase-button" data-ft-role="lifecycle-reset" type="button" :disabled="runState.kind === 'idle'" @click="reset">Reset</button>
        </div>
        <ol class="ft-showcase-lifecycle-log" data-ft-role="lifecycle-log" aria-label="Event log">
            <li v-if="log.length === 0" data-ft-role="lifecycle-log-entry">No events yet.</li>
            <li v-for="(entry, index) in log" v-else :key="`${index}-${entry}`" data-ft-role="lifecycle-log-entry">{{ entry }}</li>
        </ol>
    </section>
</template>
