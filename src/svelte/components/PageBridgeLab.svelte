<script lang="ts">
    import { onMount } from 'svelte';
    import { createPageBridgeSubscription, getPageBridgePage, type PageBridgeEnvironment, type PageBridgeEventKind, type PageBridgeObservation, type PageBridgeSubscription } from '../../common/components/pageBridge';

    let { nickname, environment }: { nickname: string; environment: PageBridgeEnvironment } = $props();
    let observation = $state<PageBridgeObservation>({ page: 'Unsupported', found: false, displayValue: '—', eventKind: null });
    let observedEvents = $state(0);
    let lastEvent = $state('—');
    let status = $state('');
    let fatal = $state(false);
    let subscription: PageBridgeSubscription | null = null;
    let active = false;

    function eventCopy(eventKind: PageBridgeEventKind): string { switch (eventKind) { case 'input': return 'Input'; case 'change': return 'Change'; case 'keyword-change': return 'Keyword changed'; case 'demo': return 'Demo event'; } }
    function commitObservation(nextObservation: PageBridgeObservation): void { if (!active || fatal) return; observation = nextObservation; status = nextObservation.found ? 'Target found.' : 'Target not found.'; if (nextObservation.eventKind !== null) { observedEvents += 1; lastEvent = eventCopy(nextObservation.eventKind); } }
    function markFatal(): void { if (!active || fatal) return; fatal = true; status = ''; console.error('Page bridge adapter became unavailable.'); }
    function refresh(): void { if (!fatal) subscription?.refresh(); }
    function focusAndHighlight(): void { if (fatal) return; const result = subscription?.focusAndHighlight(); if (result === 'focused') status = 'Target focused and highlighted.'; else if (result === 'not-found') status = 'Target not found.'; else if (result === 'failed') status = 'Page bridge action could not complete.'; }
    function dispatchDemoEvent(): void { if (fatal) return; const result = subscription?.dispatchDemoEvent(); if (result === 'dispatched') status = 'Demo event dispatched.'; else if (result === 'not-found') status = 'Target not found.'; else if (result === 'failed') status = 'Page bridge action could not complete.'; }
    function reset(): void { if (fatal) return; subscription?.clearHighlight(); observedEvents = 0; lastEvent = '—'; subscription?.refresh(); }
    export function deactivate(): void { active = false; subscription?.dispose(); subscription = null; }

    onMount(() => { active = true; observation = { page: getPageBridgePage(environment.hostname), found: false, displayValue: '—', eventKind: null }; try { subscription = createPageBridgeSubscription(environment, commitObservation, markFatal); subscription.start(); } catch { markFatal(); } return deactivate; });
</script>

<section data-ft-role="page-bridge-lab">
    <p id={`ft-${nickname}-page-bridge-description`} data-ft-role="page-bridge-description">Observe a supported page search input without changing its value.</p>
    <dl class="ft-showcase-page-bridge-summary" data-ft-role="page-bridge-summary">
        <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-target-status"><dt>Target status</dt><dd>{observation.found ? 'Found' : 'Not found'}</dd></div>
        <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-page"><dt>Page</dt><dd>{observation.page}</dd></div>
        <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-current-input-item"><dt>Current input</dt><dd><output class="ft-showcase-page-bridge-value" data-ft-role="page-bridge-current-input">{observation.displayValue}</output></dd></div>
        <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-observed-events"><dt>Observed events</dt><dd>{observedEvents}</dd></div>
        <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-last-event"><dt>Last event</dt><dd>{lastEvent}</dd></div>
    </dl>
    <div class="ft-showcase-page-bridge-actions" data-ft-role="page-bridge-actions">
        <button class="ft-showcase-button" data-ft-role="page-bridge-refresh" type="button" disabled={fatal} onclick={refresh}>Refresh target</button>
        <button class="ft-showcase-button" data-ft-role="page-bridge-focus" type="button" disabled={fatal} onclick={focusAndHighlight}>Focus &amp; highlight</button>
        <button class="ft-showcase-button" data-ft-role="page-bridge-demo" type="button" disabled={fatal} onclick={dispatchDemoEvent}>Dispatch demo event</button>
        <button class="ft-showcase-button" data-ft-role="page-bridge-reset" type="button" disabled={fatal} onclick={reset}>Reset</button>
    </div>
    <div id={`ft-${nickname}-page-bridge-status`} role="status" aria-live="polite" aria-atomic="true" data-ft-role="page-bridge-status">{status}</div>
    <div data-ft-role="page-bridge-error-slot">{#if fatal}<div id={`ft-${nickname}-page-bridge-error`} class="ft-showcase-error" role="alert">Page bridge is unavailable.</div>{/if}</div>
</section>
