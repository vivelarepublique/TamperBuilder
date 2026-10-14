// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { determineWindowPropertyIsLoaded, waitElementFinishLoading } from '../../src/common/utils/monitoringElement';

interface ObserverHarness {
    callback?: MutationCallback;
    disconnect: ReturnType<typeof vi.fn>;
    observe: ReturnType<typeof vi.fn>;
    constructor: ReturnType<typeof vi.fn>;
}

function installObserver(): ObserverHarness {
    const harness: ObserverHarness = { disconnect: vi.fn(), observe: vi.fn(), constructor: vi.fn() };
    class ObserverMock {
        constructor(callback: MutationCallback) {
            harness.constructor(callback);
            harness.callback = callback;
        }

        disconnect = harness.disconnect;
        observe = harness.observe;
        takeRecords = () => [];
    }
    vi.stubGlobal('MutationObserver', ObserverMock);
    return harness;
}

describe('element and property waiting', () => {
    beforeEach(() => {
        document.body.replaceChildren();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('returns an existing element without creating an observer', async () => {
        const target = document.createElement('div');
        target.id = 'target';
        document.body.appendChild(target);
        const observer = installObserver();

        await expect(waitElementFinishLoading('#target')).resolves.toEqual({ status: 'found', element: target });
        expect(observer.constructor).not.toHaveBeenCalled();
    });

    it('disconnects the observer after finding a later element', async () => {
        const observer = installObserver();
        const waiting = waitElementFinishLoading('#target');
        const target = document.createElement('div');
        target.id = 'target';
        document.body.appendChild(target);
        observer.callback?.([], {} as MutationObserver);

        await expect(waiting).resolves.toEqual({ status: 'found', element: target });
        expect(observer.observe).toHaveBeenCalledOnce();
        expect(observer.disconnect).toHaveBeenCalledOnce();
    });

    it('cleans the observer, timer, and abort listener on timeout', async () => {
        vi.useFakeTimers();
        const observer = installObserver();
        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const waiting = waitElementFinishLoading('#missing', { timeout: 10, signal: controller.signal });

        await vi.advanceTimersByTimeAsync(10);
        await expect(waiting).resolves.toEqual({ status: 'timeout' });
        expect(observer.disconnect).toHaveBeenCalledOnce();
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
        expect(vi.getTimerCount()).toBe(0);
    });

    it('cleans the observer and timer on abort', async () => {
        vi.useFakeTimers();
        const observer = installObserver();
        const controller = new AbortController();
        const waiting = waitElementFinishLoading('#missing', { timeout: 100, signal: controller.signal });
        controller.abort();

        await expect(waiting).resolves.toEqual({ status: 'aborted' });
        expect(observer.disconnect).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('removes the load listener when a property wait completes or loses a race', async () => {
        Object.defineProperty(document, 'readyState', { configurable: true, value: 'loading' });
        const removeListener = vi.spyOn(window, 'removeEventListener');
        const loaded = determineWindowPropertyIsLoaded('__readyForTest');
        Object.defineProperty(window, '__readyForTest', { configurable: true, value: true });
        window.dispatchEvent(new Event('load'));
        await expect(loaded).resolves.toEqual({ status: 'loaded', available: true });
        expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function));

        const controller = new AbortController();
        const aborted = determineWindowPropertyIsLoaded('__neverReadyForTest', { signal: controller.signal });
        controller.abort();
        await expect(aborted).resolves.toEqual({ status: 'aborted' });
        expect(removeListener).toHaveBeenCalledWith('load', expect.any(Function));
        delete (window as unknown as Record<string, unknown>).__readyForTest;
    });
});
