<script lang="ts">
    import { onMount } from 'svelte';
    import { formatMilliseconds, isAbortError, isBenchmarkTimeoutError, type BenchmarkSize, type RenderLabDependencies } from '../../common/components/benchmark';
    import { createBenchmarkModel } from '../store/benchmark.svelte';

    let { nickname, dependencies }: { nickname: string; dependencies: RenderLabDependencies } = $props();
    const model = createBenchmarkModel();
    let runSequence = 0;
    let activeRunId: number | null = null;
    let controller: AbortController | null = null;
    let mounted = false;
    let running = $derived(model.status.kind === 'running');
    let strictInitial = $derived(model.size === 1000 && model.rows.length === 0 && model.metrics === null && model.status.kind === 'idle' && model.inputError === null);
    let statusCopy = $derived.by(() => { switch (model.status.kind) { case 'running': return 'Running…'; case 'success': return 'Scenario complete.'; case 'startHidden': return 'Keep this page visible, then try again.'; case 'canceled': return 'Scenario canceled.'; case 'timeout': return 'Scenario timed out. Try again or reset.'; case 'error': return 'Scenario could not complete.'; default: return ''; } });

    function invalidateRun(): void { controller?.abort(); runSequence += 1; activeRunId = null; controller = null; }
    function cancel(): void { if (!running) return; invalidateRun(); model.clearResult(); model.setStatus({ kind: 'canceled' }); }
    function reset(): void { if (!running && !strictInitial) model.reset(); }
    function updateSize(event: Event): void { if (running) return; const value = Number((event.currentTarget as HTMLSelectElement).value); if (value !== 250 && value !== 1000 && value !== 2000) { model.setInputError('invalid-size'); return; } model.setSize(value as BenchmarkSize); }
    async function run(): Promise<void> {
        if (running) return;
        model.setInputError(null);
        if (document.hidden) { model.setStatus({ kind: 'startHidden' }); return; }
        const runId = ++runSequence; activeRunId = runId;
        const activeController = new AbortController(); controller = activeController;
        model.clearResult(); model.setStatus({ kind: 'running', runId });
        try {
            const result = await dependencies.runScenario({ size: model.size, adapter: { replaceRows: model.setRows, updateRows: model.setRows, removeRows: model.setRows, clearRows: model.setRows }, scheduler: dependencies.scheduler, signal: activeController.signal });
            if (activeRunId !== runId || activeController.signal.aborted || !mounted) return;
            formatMilliseconds(result.createMs); formatMilliseconds(result.updateMs); formatMilliseconds(result.removeMs);
            if (!Number.isInteger(result.remainingRows) || result.remainingRows < 0) throw new RangeError('Remaining rows must be a non-negative integer.');
            model.setMetrics(result); model.setStatus({ kind: 'success' });
        } catch (error) {
            if (activeRunId !== runId || activeController.signal.aborted || !mounted || isAbortError(error)) return;
            model.clearResult();
            if (isBenchmarkTimeoutError(error)) { model.setStatus({ kind: 'timeout', phase: error.phase }); console.warn('Render lab phase timed out.', { phase: error.phase, size: model.size }); }
            else { model.setStatus({ kind: 'error' }); console.error('Render lab scenario failed.', error); }
        } finally { if (activeRunId === runId && !activeController.signal.aborted && mounted) { activeRunId = null; controller = null; } }
    }
    onMount(() => { mounted = true; const listener = () => { if (document.hidden && running) cancel(); }; document.addEventListener('visibilitychange', listener); return () => { mounted = false; invalidateRun(); document.removeEventListener('visibilitychange', listener); }; });
</script>

<section data-ft-role="render-lab"><p id={`ft-${nickname}-render-description`} data-ft-role="render-description">Run one bounded create, update, and remove scenario.</p><p class="ft-showcase-muted" data-ft-role="render-disclaimer">Results reflect one interaction on this page, device, and build. They are not a scientific cross-framework benchmark.</p>
    <div class="ft-showcase-render-controls" data-ft-role="render-controls"><div class="ft-showcase-field" data-ft-role="render-size-field"><label class="ft-showcase-label" for={`ft-${nickname}-render-size`}>Row count</label><select id={`ft-${nickname}-render-size`} class="ft-showcase-select" data-ft-role="render-size" value={model.size} disabled={running} aria-invalid={model.inputError ? 'true' : undefined} aria-errormessage={model.inputError ? `ft-${nickname}-render-error` : undefined} onchange={updateSize}><option value="250">250</option><option value="1000">1000</option><option value="2000">2000</option></select></div><button class="ft-showcase-button" data-ft-role="render-run" type="button" disabled={running} onclick={() => void run()}>Run scenario</button><button class="ft-showcase-button" data-ft-role="render-secondary" type="button" disabled={!running && strictInitial} onclick={running ? cancel : reset}>{running ? 'Cancel' : 'Reset'}</button><div data-ft-role="render-error-slot">{#if model.inputError}<div id={`ft-${nickname}-render-error`} class="ft-showcase-error" role="alert">Choose a valid row count.</div>{/if}</div></div>
    <div role="status" aria-live="polite" aria-atomic="true" data-ft-role="render-status">{statusCopy}</div><dl class="ft-showcase-metrics" data-ft-role="render-metrics"><div class="ft-showcase-metric" data-ft-role="metric-create"><dt>Create</dt><dd>{model.metrics ? formatMilliseconds(model.metrics.createMs) : '—'}</dd></div><div class="ft-showcase-metric" data-ft-role="metric-update"><dt>Update every 10th</dt><dd>{model.metrics ? formatMilliseconds(model.metrics.updateMs) : '—'}</dd></div><div class="ft-showcase-metric" data-ft-role="metric-remove"><dt>Remove every 7th</dt><dd>{model.metrics ? formatMilliseconds(model.metrics.removeMs) : '—'}</dd></div><div class="ft-showcase-metric" data-ft-role="metric-remaining"><dt>Remaining rows</dt><dd>{model.metrics ? model.metrics.remainingRows : '—'}</dd></div></dl>
    <table class="ft-showcase-table" data-ft-role="render-table"><thead><tr><th>ID</th><th>Label</th><th>Revision</th></tr></thead><tbody>{#each model.rows as row (row.id)}<tr data-ft-role="render-row"><td>{row.id}</td><td>{row.label}</td><td>{row.revision === 0 ? '0' : '1 · Updated'}</td></tr>{/each}</tbody></table>
</section>
