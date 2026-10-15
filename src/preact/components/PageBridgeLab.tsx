import { batch, signal } from '@preact/signals';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';
import type { PanelLifecycleHandle } from '../../common/components/dialog';
import {
    createPageBridgeSubscription,
    getPageBridgePage,
    type PageBridgeEnvironment,
    type PageBridgeEventKind,
    type PageBridgeObservation,
    type PageBridgeSubscription,
} from '../../common/components/pageBridge';

function eventCopy(eventKind: PageBridgeEventKind): string {
    switch (eventKind) {
        case 'input': return 'Input';
        case 'change': return 'Change';
        case 'keyword-change': return 'Keyword changed';
        case 'demo': return 'Demo event';
    }
}

function createPageBridgeModel(environment: PageBridgeEnvironment) {
    const observation = signal<PageBridgeObservation>({ page: getPageBridgePage(environment.hostname), found: false, displayValue: '—', eventKind: null });
    const observedEvents = signal(0);
    const lastEvent = signal('—');
    const status = signal('');
    const fatal = signal(false);
    return {
        observation, observedEvents, lastEvent, status, fatal,
        commitObservation(nextObservation: PageBridgeObservation) {
            batch(() => {
                observation.value = nextObservation;
                status.value = nextObservation.found ? 'Target found.' : 'Target not found.';
                if (nextObservation.eventKind !== null) {
                    observedEvents.value += 1;
                    lastEvent.value = eventCopy(nextObservation.eventKind);
                }
            });
        },
        setFatal() { batch(() => { fatal.value = true; status.value = ''; }); },
        setStatus(copy: string) { status.value = copy; },
        resetEvents() { batch(() => { observedEvents.value = 0; lastEvent.value = '—'; }); },
    };
}

export default function PageBridgeLab({ nickname, environment, registerLifecycle }: { readonly nickname: string; readonly environment: PageBridgeEnvironment; readonly registerLifecycle: (handle: PanelLifecycleHandle) => () => void }) {
    const model = useMemo(() => createPageBridgeModel(environment), [environment]);
    const subscriptionRef = useRef<PageBridgeSubscription | null>(null);
    const activeRef = useRef(false);
    const fatalRef = useRef(false);

    const markFatal = useCallback(() => {
        if (!activeRef.current || fatalRef.current) return;
        fatalRef.current = true;
        model.setFatal();
        console.error('Page bridge adapter became unavailable.');
    }, [model]);

    const deactivate = useCallback(() => {
        activeRef.current = false;
        subscriptionRef.current?.dispose();
        subscriptionRef.current = null;
    }, []);

    useEffect(() => {
        activeRef.current = true;
        fatalRef.current = false;
        const unregister = registerLifecycle({ deactivate });
        const commitObservation = (nextObservation: PageBridgeObservation) => {
            if (!activeRef.current || fatalRef.current) return;
            model.commitObservation(nextObservation);
        };
        let mountedSubscription: PageBridgeSubscription | null = null;
        try {
            mountedSubscription = createPageBridgeSubscription(environment, commitObservation, markFatal);
            subscriptionRef.current = mountedSubscription;
            mountedSubscription.start();
        } catch {
            markFatal();
        }
        return () => {
            activeRef.current = false;
            mountedSubscription?.dispose();
            if (subscriptionRef.current === mountedSubscription) subscriptionRef.current = null;
            unregister();
        };
    }, [deactivate, environment, markFatal, model, registerLifecycle]);

    function refresh(): void { if (!fatalRef.current) subscriptionRef.current?.refresh(); }
    function focusAndHighlight(): void {
        if (fatalRef.current) return;
        const result = subscriptionRef.current?.focusAndHighlight();
        if (result === 'focused') model.setStatus('Target focused and highlighted.');
        else if (result === 'not-found') model.setStatus('Target not found.');
        else if (result === 'failed') model.setStatus('Page bridge action could not complete.');
    }
    function dispatchDemoEvent(): void {
        if (fatalRef.current) return;
        const result = subscriptionRef.current?.dispatchDemoEvent();
        if (result === 'dispatched') model.setStatus('Demo event dispatched.');
        else if (result === 'not-found') model.setStatus('Target not found.');
        else if (result === 'failed') model.setStatus('Page bridge action could not complete.');
    }
    function reset(): void {
        if (fatalRef.current) return;
        subscriptionRef.current?.clearHighlight();
        model.resetEvents();
        subscriptionRef.current?.refresh();
    }

    return <section data-ft-role='page-bridge-lab'>
        <p id={`ft-${nickname}-page-bridge-description`} data-ft-role='page-bridge-description'>Observe a supported page search input without changing its value.</p>
        <dl class='ft-showcase-page-bridge-summary' data-ft-role='page-bridge-summary'>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-target-status'><dt>Target status</dt><dd>{model.observation.value.found ? 'Found' : 'Not found'}</dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-page'><dt>Page</dt><dd>{model.observation.value.page}</dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-current-input-item'><dt>Current input</dt><dd><output class='ft-showcase-page-bridge-value' data-ft-role='page-bridge-current-input'>{model.observation.value.displayValue}</output></dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-observed-events'><dt>Observed events</dt><dd>{model.observedEvents.value}</dd></div>
            <div class='ft-showcase-page-bridge-item' data-ft-role='page-bridge-last-event'><dt>Last event</dt><dd>{model.lastEvent.value}</dd></div>
        </dl>
        <div class='ft-showcase-page-bridge-actions' data-ft-role='page-bridge-actions'>
            <button class='ft-showcase-button' data-ft-role='page-bridge-refresh' type='button' disabled={model.fatal.value} onClick={refresh}>Refresh target</button>
            <button class='ft-showcase-button' data-ft-role='page-bridge-focus' type='button' disabled={model.fatal.value} onClick={focusAndHighlight}>Focus &amp; highlight</button>
            <button class='ft-showcase-button' data-ft-role='page-bridge-demo' type='button' disabled={model.fatal.value} onClick={dispatchDemoEvent}>Dispatch demo event</button>
            <button class='ft-showcase-button' data-ft-role='page-bridge-reset' type='button' disabled={model.fatal.value} onClick={reset}>Reset</button>
        </div>
        <div id={`ft-${nickname}-page-bridge-status`} role='status' aria-live='polite' aria-atomic='true' data-ft-role='page-bridge-status'>{model.status.value}</div>
        <div data-ft-role='page-bridge-error-slot'>{model.fatal.value && <div id={`ft-${nickname}-page-bridge-error`} class='ft-showcase-error' role='alert'>Page bridge is unavailable.</div>}</div>
    </section>;
}
