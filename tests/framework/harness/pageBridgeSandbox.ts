import type { PageBridgeEnvironment } from '../../../src/common/components/pageBridge';

const highlightAttribute = 'data-ft-showcase-page-bridge-highlight';

interface ObserverRecord {
    readonly callback: MutationCallback;
    connected: boolean;
}

interface InstrumentedTarget {
    readonly target: EventTarget;
    readonly listeners: Map<string, Set<EventListenerOrEventListenerObject>>;
}

export interface PageBridgeSandbox {
    readonly root: HTMLElement;
    readonly environment: PageBridgeEnvironment;
    addSearchInput(value?: string): HTMLInputElement;
    replaceSearchInput(value?: string): HTMLInputElement;
    fireMutation(): void;
    fireLateMutation(): void;
    fireLateTimer(): void;
    fireCustomEvent(): void;
    runTimers(): void;
    ledger(): { readonly observers: number; readonly timers: number; readonly listeners: number };
    operations(): readonly string[];
    clearOperations(): void;
    dispose(): void;
}

function instrument(target: EventTarget, label: 'custom' | 'target', operations: string[]): InstrumentedTarget {
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, listener, options) => {
        if (listener !== null) {
            const registrations = listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
            registrations.add(listener);
            listeners.set(type, registrations);
            operations.push(`listener:${label}:add:${type}`);
        }
        add(type, listener, options);
    };
    target.removeEventListener = (type, listener, options) => {
        if (listener !== null) {
            listeners.get(type)?.delete(listener);
            operations.push(`listener:${label}:remove:${type}`);
        }
        remove(type, listener, options);
    };
    return { target, listeners };
}

export function createPageBridgeSandbox(): PageBridgeSandbox {
    const root = document.createElement('div');
    root.dataset.pageBridgeSandbox = '';
    document.body.appendChild(root);
    const operationLog: string[] = [];
    const customTarget = instrument(new EventTarget(), 'custom', operationLog);
    const instrumentedTargets: InstrumentedTarget[] = [customTarget];
    const observers: ObserverRecord[] = [];
    const timers = new Map<number, () => void>();
    let lastTimerCallback: (() => void) | null = null;
    let nextTimer = 1;

    function addSearchInput(value = 'private fixture value'): HTMLInputElement {
        const input = document.createElement('input');
        input.id = 'kw';
        input.value = value;
        instrumentedTargets.push(instrument(input, 'target', operationLog));
        const setAttribute = input.setAttribute.bind(input);
        const removeAttribute = input.removeAttribute.bind(input);
        input.setAttribute = (name, nextValue) => {
            if (name === highlightAttribute) operationLog.push(`highlight:set:${nextValue}`);
            setAttribute(name, nextValue);
        };
        input.removeAttribute = name => {
            if (name === highlightAttribute) operationLog.push('highlight:remove');
            removeAttribute(name);
        };
        root.appendChild(input);
        return input;
    }

    const environment: PageBridgeEnvironment = {
        root,
        hostname: 'www.baidu.com',
        customEventTarget: customTarget.target,
        createObserver(callback) {
            const record: ObserverRecord = { callback, connected: false };
            observers.push(record);
            return {
                observe() { record.connected = true; },
                disconnect() {
                    operationLog.push('observer:disconnect');
                    record.connected = false;
                },
                takeRecords() { return []; },
            };
        },
        setTimer(callback) {
            const id = nextTimer++;
            lastTimerCallback = callback;
            timers.set(id, callback);
            return id;
        },
        clearTimer(handle) {
            operationLog.push('timer:clear');
            timers.delete(Number(handle));
        },
    };

    return {
        root,
        environment,
        addSearchInput,
        replaceSearchInput(value) {
            root.querySelector('#kw')?.remove();
            return addSearchInput(value);
        },
        fireMutation() {
            for (const observer of observers) if (observer.connected) observer.callback([], {} as MutationObserver);
        },
        fireLateMutation() {
            observers.at(-1)?.callback([], {} as MutationObserver);
        },
        fireLateTimer() {
            lastTimerCallback?.();
        },
        fireCustomEvent() {
            customTarget.target.dispatchEvent(new Event('kwChanged'));
        },
        runTimers() {
            const callbacks = [...timers.values()];
            timers.clear();
            callbacks.forEach(callback => callback());
        },
        ledger() {
            return {
                observers: observers.filter(observer => observer.connected).length,
                timers: timers.size,
                listeners: instrumentedTargets.reduce((total, target) => total + [...target.listeners.values()].reduce((count, listeners) => count + listeners.size, 0), 0),
            };
        },
        operations() {
            return [...operationLog];
        },
        clearOperations() {
            operationLog.length = 0;
        },
        dispose() {
            root.remove();
        },
    };
}
