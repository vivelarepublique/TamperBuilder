<script setup lang="ts">
    import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
    import {
        browserRenderLabDependencies,
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

    const props = withDefaults(defineProps<{ nickname: string; dependencies?: RenderLabDependencies }>(), {
        dependencies: () => browserRenderLabDependencies,
    });
    const size = ref<BenchmarkSize>(1000);
    const rows = ref<readonly BenchmarkRow[]>([]);
    const metrics = ref<BenchmarkMetrics | null>(null);
    const status = ref<RenderStatus>({ kind: 'idle' });
    const inputError = ref<null | 'invalid-size'>(null);
    let runSequence = 0;
    let activeRunId: number | null = null;
    let controller: AbortController | null = null;
    let mounted = false;

    const running = computed(() => status.value.kind === 'running');
    const strictInitial = computed(
        () => size.value === 1000 && rows.value.length === 0 && metrics.value === null && status.value.kind === 'idle' && inputError.value === null,
    );
    const statusCopy = computed(() => {
        switch (status.value.kind) {
            case 'running': return 'Running…';
            case 'success': return 'Scenario complete.';
            case 'startHidden': return 'Keep this page visible, then try again.';
            case 'canceled': return 'Scenario canceled.';
            case 'timeout': return 'Scenario timed out. Try again or reset.';
            case 'error': return 'Scenario could not complete.';
            default: return '';
        }
    });

    function setRows(nextRows: readonly BenchmarkRow[]): void {
        rows.value = nextRows;
    }

    function invalidateRun(): void {
        controller?.abort();
        runSequence += 1;
        activeRunId = null;
        controller = null;
    }

    function cancel(): void {
        if (!running.value) return;
        invalidateRun();
        rows.value = [];
        metrics.value = null;
        status.value = { kind: 'canceled' };
    }

    function reset(): void {
        if (running.value || strictInitial.value) return;
        size.value = 1000;
        rows.value = [];
        metrics.value = null;
        status.value = { kind: 'idle' };
        inputError.value = null;
    }

    function updateSize(event: Event): void {
        if (running.value) return;
        const value = Number((event.currentTarget as HTMLSelectElement).value);
        if (value !== 250 && value !== 1000 && value !== 2000) {
            inputError.value = 'invalid-size';
            return;
        }
        size.value = value;
        inputError.value = null;
    }

    async function run(): Promise<void> {
        if (running.value) return;
        inputError.value = null;
        if (document.hidden) {
            status.value = { kind: 'startHidden' };
            return;
        }
        const runId = ++runSequence;
        activeRunId = runId;
        controller = new AbortController();
        const activeController = controller;
        rows.value = [];
        metrics.value = null;
        status.value = { kind: 'running', runId };
        try {
            const result = await props.dependencies.runScenario({
                size: size.value,
                adapter: { replaceRows: setRows, updateRows: setRows, removeRows: setRows, clearRows: setRows },
                scheduler: props.dependencies.scheduler,
                signal: activeController.signal,
            });
            if (activeRunId !== runId || activeController.signal.aborted || !mounted) return;
            formatMilliseconds(result.createMs);
            formatMilliseconds(result.updateMs);
            formatMilliseconds(result.removeMs);
            if (!Number.isInteger(result.remainingRows) || result.remainingRows < 0) throw new RangeError('Remaining rows must be a non-negative integer.');
            metrics.value = result;
            status.value = { kind: 'success' };
        } catch (error) {
            if (activeRunId !== runId || activeController.signal.aborted || !mounted || isAbortError(error)) return;
            rows.value = [];
            metrics.value = null;
            if (isBenchmarkTimeoutError(error)) {
                status.value = { kind: 'timeout', phase: error.phase };
                console.warn('Render lab phase timed out.', { phase: error.phase, size: size.value });
            } else {
                status.value = { kind: 'error' };
                console.error('Render lab scenario failed.', error);
            }
        } finally {
            if (activeRunId === runId && !activeController.signal.aborted && mounted) {
                activeRunId = null;
                controller = null;
            }
        }
    }

    function onVisibilityChange(): void {
        if (document.hidden && running.value) cancel();
    }

    onMounted(() => {
        mounted = true;
        document.addEventListener('visibilitychange', onVisibilityChange);
    });
    onBeforeUnmount(() => {
        mounted = false;
        invalidateRun();
        document.removeEventListener('visibilitychange', onVisibilityChange);
    });
</script>

<template>
    <section data-ft-role="render-lab">
        <p :id="`ft-${nickname}-render-description`" data-ft-role="render-description">Run one bounded create, update, and remove scenario.</p>
        <p class="ft-showcase-muted" data-ft-role="render-disclaimer">Results reflect one interaction on this page, device, and build. They are not a scientific cross-framework benchmark.</p>
        <div class="ft-showcase-render-controls" data-ft-role="render-controls">
            <div class="ft-showcase-field" data-ft-role="render-size-field">
                <label class="ft-showcase-label" :for="`ft-${nickname}-render-size`">Row count</label>
                <select
                    :id="`ft-${nickname}-render-size`"
                    class="ft-showcase-select"
                    data-ft-role="render-size"
                    :value="size"
                    :disabled="running"
                    :aria-invalid="inputError ? 'true' : undefined"
                    :aria-errormessage="inputError ? `ft-${nickname}-render-error` : undefined"
                    @change="updateSize"
                >
                    <option :value="250">250</option><option :value="1000">1000</option><option :value="2000">2000</option>
                </select>
            </div>
            <button class="ft-showcase-button" data-ft-role="render-run" type="button" :disabled="running" @click="run">Run scenario</button>
            <button class="ft-showcase-button" data-ft-role="render-secondary" type="button" :disabled="!running && strictInitial" @click="running ? cancel() : reset()">{{ running ? 'Cancel' : 'Reset' }}</button>
            <div data-ft-role="render-error-slot">
                <div v-if="inputError" :id="`ft-${nickname}-render-error`" class="ft-showcase-error" role="alert">Choose a valid row count.</div>
            </div>
        </div>
        <div role="status" aria-live="polite" aria-atomic="true" data-ft-role="render-status">{{ statusCopy }}</div>
        <dl class="ft-showcase-metrics" data-ft-role="render-metrics">
            <div class="ft-showcase-metric" data-ft-role="metric-create"><dt>Create</dt><dd>{{ metrics ? formatMilliseconds(metrics.createMs) : '—' }}</dd></div>
            <div class="ft-showcase-metric" data-ft-role="metric-update"><dt>Update every 10th</dt><dd>{{ metrics ? formatMilliseconds(metrics.updateMs) : '—' }}</dd></div>
            <div class="ft-showcase-metric" data-ft-role="metric-remove"><dt>Remove every 7th</dt><dd>{{ metrics ? formatMilliseconds(metrics.removeMs) : '—' }}</dd></div>
            <div class="ft-showcase-metric" data-ft-role="metric-remaining"><dt>Remaining rows</dt><dd>{{ metrics ? metrics.remainingRows : '—' }}</dd></div>
        </dl>
        <table class="ft-showcase-table" data-ft-role="render-table">
            <thead><tr><th>ID</th><th>Label</th><th>Revision</th></tr></thead>
            <tbody>
                <tr v-for="row in rows" :key="row.id" data-ft-role="render-row"><td>{{ row.id }}</td><td>{{ row.label }}</td><td>{{ row.revision === 0 ? '0' : '1 · Updated' }}</td></tr>
            </tbody>
        </table>
    </section>
</template>
