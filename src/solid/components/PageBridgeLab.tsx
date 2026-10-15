import { batch, createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { PanelLifecycleHandle } from '../../common/components/dialog';
import { createPageBridgeSubscription, getPageBridgePage, type PageBridgeEnvironment, type PageBridgeEventKind, type PageBridgeObservation, type PageBridgeSubscription } from '../../common/components/pageBridge';

function eventCopy(eventKind: PageBridgeEventKind): string { switch (eventKind) { case 'input': return 'Input'; case 'change': return 'Change'; case 'keyword-change': return 'Keyword changed'; case 'demo': return 'Demo event'; } }

export default function PageBridgeLab(props: { readonly nickname: string; readonly environment: PageBridgeEnvironment; readonly registerLifecycle: (handle: PanelLifecycleHandle) => () => void }) {
    // The injected environment is immutable for the lifetime of this mounted panel.
    // eslint-disable-next-line solid/reactivity
    const initialPage = getPageBridgePage(props.environment.hostname);
    const [observation, setObservation] = createSignal<PageBridgeObservation>({ page: initialPage, found: false, displayValue: '—', eventKind: null });
    const [observedEvents, setObservedEvents] = createSignal(0);
    const [lastEvent, setLastEvent] = createSignal('—');
    const [status, setStatus] = createSignal('');
    const [fatal, setFatal] = createSignal(false);
    let subscription: PageBridgeSubscription | null = null;
    let active = false;
    let fatalLatched = false;

    function markFatal(): void { if (!active || fatalLatched) return; fatalLatched = true; batch(() => { setFatal(true); setStatus(''); }); console.error('Page bridge adapter became unavailable.'); }
    function commitObservation(nextObservation: PageBridgeObservation): void { if (!active || fatalLatched) return; batch(() => { setObservation(nextObservation); setStatus(nextObservation.found ? 'Target found.' : 'Target not found.'); if (nextObservation.eventKind !== null) { setObservedEvents(count => count + 1); setLastEvent(eventCopy(nextObservation.eventKind)); } }); }
    function deactivate(): void { active = false; subscription?.dispose(); subscription = null; }
    function refresh(): void { if (!fatalLatched) subscription?.refresh(); }
    function focusAndHighlight(): void { if (fatalLatched) return; const result = subscription?.focusAndHighlight(); if (result === 'focused') setStatus('Target focused and highlighted.'); else if (result === 'not-found') setStatus('Target not found.'); else if (result === 'failed') setStatus('Page bridge action could not complete.'); }
    function dispatchDemoEvent(): void { if (fatalLatched) return; const result = subscription?.dispatchDemoEvent(); if (result === 'dispatched') setStatus('Demo event dispatched.'); else if (result === 'not-found') setStatus('Target not found.'); else if (result === 'failed') setStatus('Page bridge action could not complete.'); }
    function reset(): void { if (fatalLatched) return; subscription?.clearHighlight(); batch(() => { setObservedEvents(0); setLastEvent('—'); }); subscription?.refresh(); }

    onMount(() => {
        active = true;
        const unregister = props.registerLifecycle({ deactivate });
        try { subscription = createPageBridgeSubscription(props.environment, commitObservation, markFatal); subscription.start(); } catch { markFatal(); }
        onCleanup(() => { deactivate(); unregister(); });
    });

    return <section data-ft-role='page-bridge-lab'>
        <p id={`ft-${props.nickname}-page-bridge-description`} data-ft-role='page-bridge-description'>Observe a supported page search input without changing its value.</p>
        <dl class='ft-showcase-page-bridge-summary' data-ft-role='page-bridge-summary'>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-target-status'><dt>Target status</dt><dd>{observation().found ? 'Found' : 'Not found'}</dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-page'><dt>Page</dt><dd>{observation().page}</dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-current-input-item'><dt>Current input</dt><dd><output class='ft-showcase-page-bridge-value' data-ft-role='page-bridge-current-input'>{observation().displayValue}</output></dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-observed-events'><dt>Observed events</dt><dd>{observedEvents()}</dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-last-event'><dt>Last event</dt><dd>{lastEvent()}</dd></div>
        </dl>
        <div class='ft-showcase-page-bridge-actions' data-ft-role='page-bridge-actions'>
            <button class='ft-showcase-button' data-ft-role='page-bridge-refresh' type='button' disabled={fatal()} onClick={refresh}>Refresh target</button>
            <button class='ft-showcase-button' data-ft-role='page-bridge-focus' type='button' disabled={fatal()} onClick={focusAndHighlight}>Focus &amp; highlight</button>
            <button class='ft-showcase-button' data-ft-role='page-bridge-demo' type='button' disabled={fatal()} onClick={dispatchDemoEvent}>Dispatch demo event</button>
            <button class='ft-showcase-button' data-ft-role='page-bridge-reset' type='button' disabled={fatal()} onClick={reset}>Reset</button>
        </div>
        <div id={`ft-${props.nickname}-page-bridge-status`} role='status' aria-live='polite' aria-atomic='true' data-ft-role='page-bridge-status'>{status()}</div>
        <div data-ft-role='page-bridge-error-slot'><Show when={fatal()}><div id={`ft-${props.nickname}-page-bridge-error`} class='ft-showcase-error' role='alert'>Page bridge is unavailable.</div></Show></div>
    </section>;
}
