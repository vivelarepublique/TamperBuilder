// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    createPageBridgeSubscription,
    formatPageBridgeValue,
    getPageBridgePage,
} from '../../src/common/components/pageBridge';
import type { PageBridgeEnvironment, PageBridgeObservation } from '../../src/common/components/pageBridge';

class FakeObserver {
    readonly observe = vi.fn();
    readonly disconnect = vi.fn();

    constructor(readonly callback: MutationCallback) {}

    trigger(): void {
        this.callback([], this as unknown as MutationObserver);
    }
}

class TrackingEventTarget extends EventTarget {
    readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();

    override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions): void {
        super.addEventListener(type, callback, options);
        if (callback !== null) {
            const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
            listeners.add(callback);
            this.listeners.set(type, listeners);
        }
    }

    override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions): void {
        super.removeEventListener(type, callback, options);
        if (callback !== null) this.listeners.get(type)?.delete(callback);
    }
}

interface Fixture {
    readonly root: HTMLElement;
    readonly target: TrackingEventTarget;
    readonly observer: FakeObserver;
    readonly timers: Map<ReturnType<typeof setTimeout>, () => void>;
    readonly environment: PageBridgeEnvironment;
}

function createFixture(hostname = 'www.baidu.com'): Fixture {
    const root = document.createElement('div');
    document.body.append(root);
    const target = new TrackingEventTarget();
    const timers = new Map<ReturnType<typeof setTimeout>, () => void>();
    let nextTimer = 1;
    let observer: FakeObserver | null = null;
    const environment: PageBridgeEnvironment = {
        root,
        hostname,
        customEventTarget: target,
        createObserver: callback => {
            observer = new FakeObserver(callback);
            return observer as unknown as MutationObserver;
        },
        setTimer: callback => {
            const handle = nextTimer++ as unknown as ReturnType<typeof setTimeout>;
            timers.set(handle, callback);
            return handle;
        },
        clearTimer: handle => {
            timers.delete(handle);
        },
    };
    // The subscription creates the observer during start(), after this fixture is returned.
    return {
        root,
        target,
        get observer() {
            if (observer === null) throw new Error('Observer has not started.');
            return observer;
        },
        timers,
        environment,
    };
}

function createInput(root: HTMLElement, tag: 'input' | 'textarea', id: string, value: string): HTMLInputElement | HTMLTextAreaElement {
    const element = document.createElement(tag);
    element.id = id;
    element.value = value;
    root.append(element);
    return element;
}

afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
});

describe('page bridge adapter', () => {
    it.each([
        ['www.baidu.com', 'input', 'kw', 'Baidu'],
        ['www.bing.com', 'textarea', 'sb_form_q', 'Bing'],
        ['www.google.com', 'textarea', 'APjFqb', 'Google'],
    ] as const)('uses the exact root-scoped selector for %s', (hostname, tag, id, page) => {
        const fixture = createFixture(hostname);
        createInput(document.body, tag, id, 'outside');
        createInput(fixture.root, tag, id, 'inside');
        const observations: PageBridgeObservation[] = [];
        const subscription = createPageBridgeSubscription(fixture.environment, observation => observations.push(observation), vi.fn());
        subscription.start();

        expect(observations).toEqual([{ page, found: true, displayValue: 'inside', eventKind: null }]);
        expect(fixture.observer.observe).toHaveBeenCalledWith(fixture.root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['id'],
        });
        subscription.dispose();
    });

    it('reports unsupported and not-found targets without creating fallbacks', () => {
        const fixture = createFixture('example.com');
        const observations: PageBridgeObservation[] = [];
        const subscription = createPageBridgeSubscription(fixture.environment, observation => observations.push(observation), vi.fn());
        subscription.start();
        expect(observations).toEqual([{ page: 'Unsupported', found: false, displayValue: '—', eventKind: null }]);
        expect(fixture.root.children).toHaveLength(0);
        expect(getPageBridgePage('example.com')).toBe('Unsupported');
        subscription.dispose();
    });

    it('formats empty and Unicode values at the 80-code-point boundary', () => {
        expect(formatPageBridgeValue('')).toBe('(empty)');
        expect(formatPageBridgeValue('😀'.repeat(80))).toBe('😀'.repeat(80));
        expect(formatPageBridgeValue(`${'😀'.repeat(80)}x`)).toBe(`${'😀'.repeat(80)}…`);
    });

    it('publishes native, keyword and fixed demo events with exact flags', () => {
        const fixture = createFixture();
        const input = createInput(fixture.root, 'input', 'kw', 'value');
        const observations: PageBridgeObservation[] = [];
        let demoEvent: Event | null = null;
        input.addEventListener('tamper-builder:page-bridge-demo', event => {
            demoEvent = event;
        });
        const subscription = createPageBridgeSubscription(fixture.environment, observation => observations.push(observation), vi.fn());
        subscription.start();
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('change'));
        fixture.target.dispatchEvent(new Event('kwChanged'));
        expect(subscription.dispatchDemoEvent()).toBe('dispatched');

        expect(observations.map(observation => observation.eventKind)).toEqual([null, 'input', 'change', 'keyword-change', null, 'demo']);
        expect(demoEvent).toBeInstanceOf(CustomEvent);
        expect((demoEvent as CustomEvent).detail).toBeNull();
        expect(demoEvent?.bubbles).toBe(false);
        expect(demoEvent?.cancelable).toBe(false);
        expect((demoEvent as CustomEvent).composed).toBe(false);
        expect(input.value).toBe('value');
        subscription.dispose();
    });

    it('rebinds on id removal or transfer and ignores stale-node events', () => {
        const fixture = createFixture();
        const oldInput = createInput(fixture.root, 'input', 'kw', 'old');
        const observations: PageBridgeObservation[] = [];
        const subscription = createPageBridgeSubscription(fixture.environment, observation => observations.push(observation), vi.fn());
        subscription.start();

        oldInput.id = 'old-kw';
        const replacement = createInput(fixture.root, 'input', 'kw', 'new');
        oldInput.dispatchEvent(new Event('input'));
        expect(observations.at(-1)).toEqual({ page: 'Baidu', found: true, displayValue: 'new', eventKind: null });
        const countAfterStaleEvent = observations.length;
        oldInput.dispatchEvent(new Event('change'));
        expect(observations).toHaveLength(countAfterStaleEvent);

        replacement.id = 'replacement';
        fixture.observer.trigger();
        expect(observations.at(-1)).toEqual({ page: 'Baidu', found: false, displayValue: '—', eventKind: null });
        subscription.dispose();
    });

    it('restores only its highlight token and replaces the owned timer', () => {
        const fixture = createFixture();
        const input = createInput(fixture.root, 'input', 'kw', 'value');
        input.setAttribute('data-ft-showcase-page-bridge-highlight', 'host-original');
        const subscription = createPageBridgeSubscription(fixture.environment, vi.fn(), vi.fn());
        subscription.start();

        expect(subscription.focusAndHighlight()).toBe('focused');
        const firstToken = input.getAttribute('data-ft-showcase-page-bridge-highlight');
        expect(firstToken).toMatch(/^tamper-builder-/u);
        expect(fixture.timers.size).toBe(1);
        expect(subscription.focusAndHighlight()).toBe('focused');
        expect(fixture.timers.size).toBe(1);
        input.classList.add('host-highlight', 'ft-showcase-page-bridge-highlight');
        input.setAttribute('data-ft-showcase-page-bridge-highlight', 'host-rewrite');
        subscription.clearHighlight();
        expect(input.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-rewrite');
        expect(input.classList.contains('host-highlight')).toBe(true);
        expect(input.classList.contains('ft-showcase-page-bridge-highlight')).toBe(true);
        expect(fixture.timers.size).toBe(0);

        input.setAttribute('data-ft-showcase-page-bridge-highlight', 'host-original');
        expect(subscription.focusAndHighlight()).toBe('focused');
        subscription.dispose();
        expect(input.getAttribute('data-ft-showcase-page-bridge-highlight')).toBe('host-original');
        expect(input.classList.contains('ft-showcase-page-bridge-highlight')).toBe(true);
    });

    it('returns unavailable when action refresh enters fatal state', () => {
        const fixture = createFixture();
        createInput(fixture.root, 'input', 'kw', 'value');
        const onFatal = vi.fn();
        const subscription = createPageBridgeSubscription(fixture.environment, vi.fn(), onFatal);
        subscription.start();
        vi.spyOn(fixture.root, 'querySelector').mockImplementation(() => {
            throw new Error('query failed');
        });

        expect(subscription.dispatchDemoEvent()).toBe('unavailable');
        expect(subscription.focusAndHighlight()).toBe('unavailable');
        expect(onFatal).toHaveBeenCalledOnce();
        expect(fixture.observer.disconnect).toHaveBeenCalledOnce();
        expect(fixture.target.listeners.get('kwChanged')?.size ?? 0).toBe(0);
    });

    it('fully disposes once and rejects every retained late callback', () => {
        const fixture = createFixture();
        const input = createInput(fixture.root, 'input', 'kw', 'value');
        const observations: PageBridgeObservation[] = [];
        const subscription = createPageBridgeSubscription(fixture.environment, observation => observations.push(observation), vi.fn());
        subscription.start();
        subscription.focusAndHighlight();
        const retainedObserverCallback = fixture.observer.callback;
        const retainedTimerCallback = [...fixture.timers.values()][0];
        subscription.dispose();
        subscription.dispose();
        const count = observations.length;

        retainedObserverCallback([], fixture.observer as unknown as MutationObserver);
        retainedTimerCallback?.();
        input.dispatchEvent(new Event('input'));
        fixture.target.dispatchEvent(new Event('kwChanged'));
        expect(observations).toHaveLength(count);
        expect(fixture.observer.disconnect).toHaveBeenCalledOnce();
        expect(fixture.target.listeners.get('kwChanged')?.size ?? 0).toBe(0);
        expect(fixture.timers.size).toBe(0);
        expect(input.hasAttribute('data-ft-showcase-page-bridge-highlight')).toBe(false);
        expect(subscription.refresh()).toBeNull();
    });

    it('keeps same-target binding idempotent and action failures recoverable', () => {
        const fixture = createFixture();
        const input = createInput(fixture.root, 'input', 'kw', 'value');
        const addListener = vi.spyOn(input, 'addEventListener');
        const onFatal = vi.fn();
        const subscription = createPageBridgeSubscription(fixture.environment, vi.fn(), onFatal);
        subscription.start();
        subscription.refresh();
        subscription.refresh();
        expect(addListener.mock.calls.filter(([name]) => name === 'input')).toHaveLength(1);
        expect(addListener.mock.calls.filter(([name]) => name === 'change')).toHaveLength(1);
        expect(addListener.mock.calls.filter(([name]) => name === 'tamper-builder:page-bridge-demo')).toHaveLength(1);

        vi.spyOn(input, 'focus').mockImplementationOnce(() => {
            throw new Error('focus failed');
        });
        expect(subscription.focusAndHighlight()).toBe('failed');
        vi.spyOn(input, 'dispatchEvent').mockImplementationOnce(() => {
            throw new Error('dispatch failed');
        });
        expect(subscription.dispatchDemoEvent()).toBe('failed');
        vi.spyOn(fixture.environment, 'setTimer').mockImplementationOnce(() => {
            throw new Error('timer failed');
        });
        expect(subscription.focusAndHighlight()).toBe('failed');
        expect(input.hasAttribute('data-ft-showcase-page-bridge-highlight')).toBe(false);
        expect(onFatal).not.toHaveBeenCalled();
        subscription.dispose();
    });

    it('continues best-effort cleanup and logs only fixed payload once', () => {
        const fixture = createFixture();
        const input = createInput(fixture.root, 'input', 'kw', 'value');
        const observations: PageBridgeObservation[] = [];
        const subscription = createPageBridgeSubscription(fixture.environment, observation => observations.push(observation), vi.fn());
        subscription.start();
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        fixture.observer.disconnect.mockImplementation(() => {
            throw new Error('disconnect failed');
        });
        subscription.dispose();
        const count = observations.length;
        input.dispatchEvent(new Event('input'));

        expect(observations).toHaveLength(count);
        expect(fixture.target.listeners.get('kwChanged')?.size ?? 0).toBe(0);
        expect(consoleError).toHaveBeenCalledOnce();
        expect(consoleError).toHaveBeenCalledWith('Page bridge cleanup could not complete.');
    });

    it('validates dependencies and isolates synchronous consumer failures', () => {
        const fixture = createFixture();
        expect(() => createPageBridgeSubscription({ ...fixture.environment, hostname: null as unknown as string }, vi.fn(), vi.fn())).toThrow(TypeError);

        createInput(fixture.root, 'input', 'kw', 'secret');
        const failure = new Error('consumer failed');
        const subscription = createPageBridgeSubscription(fixture.environment, () => {
            throw failure;
        }, vi.fn());
        expect(() => subscription.start()).toThrow(failure);
        expect(fixture.observer.disconnect).toHaveBeenCalledOnce();
        expect(fixture.target.listeners.get('kwChanged')?.size ?? 0).toBe(0);
    });
});
