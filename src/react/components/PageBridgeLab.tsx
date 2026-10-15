import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PanelLifecycleHandle } from '../../common/components/dialog';
import {
    createPageBridgeSubscription,
    getPageBridgePage,
    type PageBridgeEnvironment,
    type PageBridgeEventKind,
    type PageBridgeObservation,
    type PageBridgeSubscription,
} from '../../common/components/pageBridge';

export type PageBridgeLabHandle = PanelLifecycleHandle;

function eventCopy(eventKind: PageBridgeEventKind): string {
    switch (eventKind) {
        case 'input': return 'Input';
        case 'change': return 'Change';
        case 'keyword-change': return 'Keyword changed';
        case 'demo': return 'Demo event';
    }
}

const PageBridgeLab = forwardRef<PageBridgeLabHandle, { readonly nickname: string; readonly environment: PageBridgeEnvironment }>(function PageBridgeLab({ nickname, environment }, ref) {
    const [observation, setObservation] = useState<PageBridgeObservation>({
        page: getPageBridgePage(environment.hostname),
        found: false,
        displayValue: '—',
        eventKind: null,
    });
    const [observedEvents, setObservedEvents] = useState(0);
    const [lastEvent, setLastEvent] = useState('—');
    const [status, setStatus] = useState('');
    const [fatal, setFatal] = useState(false);
    const subscriptionRef = useRef<PageBridgeSubscription | null>(null);
    const activeRef = useRef(false);
    const fatalRef = useRef(false);

    const markFatal = useCallback(() => {
        if (!activeRef.current || fatalRef.current) return;
        fatalRef.current = true;
        setFatal(true);
        setStatus('');
        console.error('Page bridge adapter became unavailable.');
    }, []);

    const deactivate = useCallback(() => {
        activeRef.current = false;
        subscriptionRef.current?.dispose();
        subscriptionRef.current = null;
    }, []);

    useImperativeHandle(ref, () => ({ deactivate }), [deactivate]);

    useEffect(() => {
        activeRef.current = true;
        fatalRef.current = false;
        const commitObservation = (nextObservation: PageBridgeObservation) => {
            if (!activeRef.current || fatalRef.current) return;
            setObservation(nextObservation);
            setStatus(nextObservation.found ? 'Target found.' : 'Target not found.');
            if (nextObservation.eventKind !== null) {
                setObservedEvents(count => count + 1);
                setLastEvent(eventCopy(nextObservation.eventKind));
            }
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
        };
    }, [environment, markFatal]);

    function refresh(): void {
        if (!fatalRef.current) subscriptionRef.current?.refresh();
    }

    function focusAndHighlight(): void {
        if (fatalRef.current) return;
        const result = subscriptionRef.current?.focusAndHighlight();
        if (result === 'focused') setStatus('Target focused and highlighted.');
        else if (result === 'not-found') setStatus('Target not found.');
        else if (result === 'failed') setStatus('Page bridge action could not complete.');
    }

    function dispatchDemoEvent(): void {
        if (fatalRef.current) return;
        const result = subscriptionRef.current?.dispatchDemoEvent();
        if (result === 'dispatched') setStatus('Demo event dispatched.');
        else if (result === 'not-found') setStatus('Target not found.');
        else if (result === 'failed') setStatus('Page bridge action could not complete.');
    }

    function reset(): void {
        if (fatalRef.current) return;
        subscriptionRef.current?.clearHighlight();
        setObservedEvents(0);
        setLastEvent('—');
        subscriptionRef.current?.refresh();
    }

    return <section data-ft-role='page-bridge-lab'>
        <p id={`ft-${nickname}-page-bridge-description`} data-ft-role='page-bridge-description'>Observe a supported page search input without changing its value.</p>
        <dl className='ft-showcase-page-bridge-summary' data-ft-role='page-bridge-summary'>
            <div className='ft-showcase-page-bridge-item' data-ft-role='page-bridge-target-status'><dt>Target status</dt><dd>{observation.found ? 'Found' : 'Not found'}</dd></div>
            <div className='ft-showcase-page-bridge-item' data-ft-role='page-bridge-page'><dt>Page</dt><dd>{observation.page}</dd></div>
            <div className='ft-showcase-page-bridge-item' data-ft-role='page-bridge-current-input-item'><dt>Current input</dt><dd><output className='ft-showcase-page-bridge-value' data-ft-role='page-bridge-current-input'>{observation.displayValue}</output></dd></div>
            <div className='ft-showcase-page-bridge-item' data-ft-role='page-bridge-observed-events'><dt>Observed events</dt><dd>{observedEvents}</dd></div>
            <div className='ft-showcase-page-bridge-item' data-ft-role='page-bridge-last-event'><dt>Last event</dt><dd>{lastEvent}</dd></div>
        </dl>
        <div className='ft-showcase-page-bridge-actions' data-ft-role='page-bridge-actions'>
            <button className='ft-showcase-button' data-ft-role='page-bridge-refresh' type='button' disabled={fatal} onClick={refresh}>Refresh target</button>
            <button className='ft-showcase-button' data-ft-role='page-bridge-focus' type='button' disabled={fatal} onClick={focusAndHighlight}>Focus &amp; highlight</button>
            <button className='ft-showcase-button' data-ft-role='page-bridge-demo' type='button' disabled={fatal} onClick={dispatchDemoEvent}>Dispatch demo event</button>
            <button className='ft-showcase-button' data-ft-role='page-bridge-reset' type='button' disabled={fatal} onClick={reset}>Reset</button>
        </div>
        <div id={`ft-${nickname}-page-bridge-status`} role='status' aria-live='polite' aria-atomic='true' data-ft-role='page-bridge-status'>{status}</div>
        <div data-ft-role='page-bridge-error-slot'>{fatal && <div id={`ft-${nickname}-page-bridge-error`} className='ft-showcase-error' role='alert'>Page bridge is unavailable.</div>}</div>
    </section>;
});

export default PageBridgeLab;
