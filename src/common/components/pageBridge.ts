import { windowProxy } from '../utils/tamperMonkeyFunction';

export type PageBridgePage = 'Baidu' | 'Bing' | 'Google' | 'Unsupported';
export type PageBridgeEventKind = 'input' | 'change' | 'keyword-change' | 'demo';
export type PageBridgeFocusResult = 'focused' | 'not-found' | 'failed' | 'unavailable';
export type PageBridgeDispatchResult = 'dispatched' | 'not-found' | 'failed' | 'unavailable';

export interface PageBridgeEnvironment {
    readonly root: Document | HTMLElement;
    readonly hostname: string;
    readonly customEventTarget: EventTarget;
    readonly createObserver: (callback: MutationCallback) => MutationObserver;
    readonly setTimer: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
    readonly clearTimer: (handle: ReturnType<typeof setTimeout>) => void;
}

export interface PageBridgeObservation {
    readonly page: PageBridgePage;
    readonly found: boolean;
    readonly displayValue: string;
    readonly eventKind: PageBridgeEventKind | null;
}

export interface PageBridgeSubscription {
    start(): void;
    refresh(): PageBridgeObservation | null;
    focusAndHighlight(): PageBridgeFocusResult;
    dispatchDemoEvent(): PageBridgeDispatchResult;
    clearHighlight(): void;
    dispose(): void;
}

export const PAGE_BRIDGE_TARGETS = Object.freeze({
    'www.baidu.com': Object.freeze({ page: 'Baidu' as const, selector: 'input#kw', element: 'input' as const }),
    'www.bing.com': Object.freeze({ page: 'Bing' as const, selector: 'textarea#sb_form_q', element: 'textarea' as const }),
    'www.google.com': Object.freeze({ page: 'Google' as const, selector: 'textarea#APjFqb', element: 'textarea' as const }),
});

const demoEventName = 'tamper-builder:page-bridge-demo';
const highlightAttribute = 'data-ft-showcase-page-bridge-highlight';
let nextHighlightToken = 1;

type PageBridgeTarget = HTMLInputElement | HTMLTextAreaElement;
type TargetConfiguration = (typeof PAGE_BRIDGE_TARGETS)[keyof typeof PAGE_BRIDGE_TARGETS];

function isQueryableRoot(root: unknown): root is Document | HTMLElement {
    return root instanceof Document || root instanceof HTMLElement;
}

function assertEnvironment(
    environment: PageBridgeEnvironment,
    onObservation: (observation: PageBridgeObservation) => void,
    onFatalError: () => void,
): void {
    if (
        environment === null ||
        typeof environment !== 'object' ||
        !isQueryableRoot(environment.root) ||
        typeof environment.hostname !== 'string' ||
        environment.customEventTarget === null ||
        typeof environment.customEventTarget !== 'object' ||
        typeof environment.customEventTarget.addEventListener !== 'function' ||
        typeof environment.customEventTarget.removeEventListener !== 'function' ||
        typeof environment.customEventTarget.dispatchEvent !== 'function' ||
        typeof environment.createObserver !== 'function' ||
        typeof environment.setTimer !== 'function' ||
        typeof environment.clearTimer !== 'function' ||
        typeof onObservation !== 'function' ||
        typeof onFatalError !== 'function'
    ) {
        throw new TypeError('Invalid page bridge dependencies.');
    }
}

function getConfiguration(hostname: string): TargetConfiguration | null {
    return Object.hasOwn(PAGE_BRIDGE_TARGETS, hostname) ? PAGE_BRIDGE_TARGETS[hostname as keyof typeof PAGE_BRIDGE_TARGETS] : null;
}

export function getPageBridgePage(hostname: string): PageBridgePage {
    return getConfiguration(hostname)?.page ?? 'Unsupported';
}

export function formatPageBridgeValue(value: string): string {
    if (value === '') return '(empty)';
    const codePoints = [...value];
    return codePoints.length > 80 ? `${codePoints.slice(0, 80).join('')}…` : value;
}

function containsTarget(root: Document | HTMLElement, target: Element): boolean {
    return target.isConnected && (root instanceof Document ? root.contains(target) : root.contains(target));
}

function queryTarget(root: Document | HTMLElement, configuration: TargetConfiguration | null): PageBridgeTarget | null {
    if (configuration === null) return null;
    const candidate = root.querySelector(configuration.selector);
    if (candidate === null || !containsTarget(root, candidate)) return null;
    if (configuration.element === 'input' && candidate instanceof HTMLInputElement) return candidate;
    if (configuration.element === 'textarea' && candidate instanceof HTMLTextAreaElement) return candidate;
    return null;
}

export function createPageBridgeSubscription(
    environment: PageBridgeEnvironment,
    onObservation: (observation: PageBridgeObservation) => void,
    onFatalError: () => void,
): PageBridgeSubscription {
    assertEnvironment(environment, onObservation, onFatalError);

    const configuration = getConfiguration(environment.hostname);
    const page = configuration?.page ?? 'Unsupported';
    const highlightToken = `tamper-builder-${nextHighlightToken++}`;
    let started = false;
    let disposed = false;
    let fatal = false;
    let observer: MutationObserver | null = null;
    let customListenerRegistered = false;
    let target: PageBridgeTarget | null = null;
    let highlightTarget: PageBridgeTarget | null = null;
    let highlightTimer: ReturnType<typeof setTimeout> | null = null;
    let highlightHadAttribute = false;
    let highlightPreviousValue: string | null = null;
    let highlightAddedClass = false;
    let cleanupErrorLogged = false;

    const reportCleanupError = () => {
        if (cleanupErrorLogged) return;
        cleanupErrorLogged = true;
        console.error('Page bridge cleanup could not complete.');
    };

    const restoreHighlight = (reportError: boolean) => {
        const ownedTarget = highlightTarget;
        const timer = highlightTimer;
        highlightTarget = null;
        highlightTimer = null;
        if (timer !== null) {
            try {
                environment.clearTimer(timer);
            } catch {
                if (reportError) reportCleanupError();
            }
        }
        if (ownedTarget === null) return;
        try {
            if (highlightAddedClass) ownedTarget.classList.remove('ft-showcase-page-bridge-highlight');
            highlightAddedClass = false;
            if (ownedTarget.getAttribute(highlightAttribute) === highlightToken) {
                if (highlightHadAttribute) ownedTarget.setAttribute(highlightAttribute, highlightPreviousValue ?? '');
                else ownedTarget.removeAttribute(highlightAttribute);
            }
        } catch {
            if (reportError) reportCleanupError();
        }
    };

    const removeTargetListeners = (reportError: boolean) => {
        const oldTarget = target;
        target = null;
        if (oldTarget === null) return;
        for (const [eventName, listener] of [
            ['input', onInput],
            ['change', onChange],
            [demoEventName, onDemo],
        ] as const) {
            try {
                oldTarget.removeEventListener(eventName, listener);
            } catch {
                if (reportError) reportCleanupError();
            }
        }
    };

    const cleanupResources = () => {
        const ownedObserver = observer;
        observer = null;
        if (ownedObserver !== null) {
            try {
                ownedObserver.disconnect();
            } catch {
                reportCleanupError();
            }
        }
        if (customListenerRegistered) {
            customListenerRegistered = false;
            try {
                environment.customEventTarget.removeEventListener('kwChanged', onKeywordChanged);
            } catch {
                reportCleanupError();
            }
        }
        restoreHighlight(true);
        removeTargetListeners(true);
    };

    const failConsumer = (error: unknown, asynchronous: boolean): never | null => {
        fatal = true;
        cleanupResources();
        if (asynchronous) {
            console.error('Page bridge consumer callback failed.');
            return null;
        }
        throw error;
    };

    const enterFatal = (asynchronous: boolean): null => {
        if (fatal || disposed) return null;
        fatal = true;
        cleanupResources();
        try {
            onFatalError();
        } catch (error) {
            if (asynchronous) console.error('Page bridge consumer callback failed.');
            else throw error;
        }
        return null;
    };

    const publish = (observation: PageBridgeObservation, asynchronous: boolean): PageBridgeObservation | null => {
        try {
            onObservation(observation);
            return observation;
        } catch (error) {
            return failConsumer(error, asynchronous);
        }
    };

    const bindTarget = (nextTarget: PageBridgeTarget | null): boolean => {
        if (nextTarget === target) return true;
        restoreHighlight(true);
        removeTargetListeners(true);
        if (fatal || disposed || nextTarget === null) return !fatal && !disposed;
        target = nextTarget;
        try {
            target.addEventListener('input', onInput);
            target.addEventListener('change', onChange);
            target.addEventListener(demoEventName, onDemo);
            return true;
        } catch {
            return false;
        }
    };

    const refreshInternal = (
        eventKind: PageBridgeEventKind | null,
        expectedTarget: EventTarget | null,
        asynchronous: boolean,
    ): PageBridgeObservation | null => {
        if (disposed || fatal) return null;
        let observation: PageBridgeObservation;
        try {
            const nextTarget = queryTarget(environment.root, configuration);
            const staleEvent = expectedTarget !== null && expectedTarget !== nextTarget;
            if (!bindTarget(nextTarget)) return enterFatal(asynchronous);
            observation = {
                page,
                found: nextTarget !== null,
                displayValue: nextTarget === null ? '—' : formatPageBridgeValue(nextTarget.value),
                eventKind: nextTarget === null || staleEvent ? null : eventKind,
            };
        } catch {
            return enterFatal(asynchronous);
        }
        return publish(observation, asynchronous);
    };

    function onInput(event: Event): void {
        refreshInternal('input', event.currentTarget, true);
    }
    function onChange(event: Event): void {
        refreshInternal('change', event.currentTarget, true);
    }
    function onDemo(event: Event): void {
        refreshInternal('demo', event.currentTarget, true);
    }
    function onKeywordChanged(): void {
        refreshInternal('keyword-change', null, true);
    }
    function onMutations(): void {
        refreshInternal(null, null, true);
    }

    return {
        start() {
            if (started || disposed || fatal) return;
            started = true;
            try {
                environment.customEventTarget.addEventListener('kwChanged', onKeywordChanged);
                customListenerRegistered = true;
                observer = environment.createObserver(onMutations);
                observer.observe(environment.root, { childList: true, subtree: true, attributes: true, attributeFilter: ['id'] });
            } catch {
                enterFatal(false);
                return;
            }
            refreshInternal(null, null, false);
        },
        refresh() {
            return refreshInternal(null, null, false);
        },
        focusAndHighlight() {
            const observation = refreshInternal(null, null, false);
            if (observation === null) return 'unavailable';
            if (!observation.found || target === null) return 'not-found';
            restoreHighlight(false);
            const currentTarget = target;
            try {
                currentTarget.focus({ preventScroll: true });
                highlightTarget = currentTarget;
                highlightHadAttribute = currentTarget.hasAttribute(highlightAttribute);
                highlightPreviousValue = currentTarget.getAttribute(highlightAttribute);
                highlightAddedClass = !currentTarget.classList.contains('ft-showcase-page-bridge-highlight');
                currentTarget.classList.add('ft-showcase-page-bridge-highlight');
                currentTarget.setAttribute(highlightAttribute, highlightToken);
                let firedSynchronously = false;
                const createdTimer = environment.setTimer(() => {
                    firedSynchronously = true;
                    try {
                        restoreHighlight(false);
                    } catch {
                        enterFatal(true);
                    }
                }, 800);
                if (firedSynchronously) environment.clearTimer(createdTimer);
                else highlightTimer = createdTimer;
                return 'focused';
            } catch {
                restoreHighlight(false);
                return fatal || disposed ? 'unavailable' : 'failed';
            }
        },
        dispatchDemoEvent() {
            const observation = refreshInternal(null, null, false);
            if (observation === null) return 'unavailable';
            if (!observation.found || target === null) return 'not-found';
            try {
                target.dispatchEvent(new CustomEvent(demoEventName, { bubbles: false, cancelable: false, composed: false }));
                return fatal || disposed ? 'unavailable' : 'dispatched';
            } catch {
                return fatal || disposed ? 'unavailable' : 'failed';
            }
        },
        clearHighlight() {
            restoreHighlight(true);
        },
        dispose() {
            if (disposed) return;
            disposed = true;
            cleanupResources();
        },
    };
}

export function createBrowserPageBridgeEnvironment(): PageBridgeEnvironment {
    return {
        root: document,
        hostname: location.hostname,
        customEventTarget: windowProxy,
        createObserver: callback => new MutationObserver(callback),
        setTimer: (callback, ms) => setTimeout(callback, ms),
        clearTimer: handle => clearTimeout(handle),
    };
}
