import type { ListenOptions } from '../interface/mutations';
import type { IndexedByStringElement, CommonSelectors } from '../interface/element';
import { getElement, combineSelectors } from './elementBasic';
import { debounce, throttle } from './delayTools';
import { windowProxy } from './tamperMonkeyFunction';
import { body } from '../alias';

export function listenElementChanges(selector: string | CommonSelectors, options: ListenOptions): MutationObserver {
    const { strictMode, anyMutation = false, callback = () => console.log('No action.'), attributesConcern, childrenConcern = [], immediateImplementation = false, triggerLimitation = { way: 'none', delay: 0 }, manualSetupOptions = {} } = options;

    if (!anyMutation && !attributesConcern && childrenConcern.length === 0) throw new Error('No action defined for the listener');

    if (anyMutation) Object.assign(manualSetupOptions, { childList: true, attributes: true, subtree: true });
    const { delay, way } = triggerLimitation;
    const delayedCallback = way === 'debounce' ? debounce(callback, delay) : way === 'throttle' ? throttle(callback, delay) : callback;

    if (!getElement(selector)) throw new Error('Element not found');
    const selectorTargetElement = getElement(selector) as IndexedByStringElement;

    if (immediateImplementation) {
        if (attributesConcern) callback(selectorTargetElement[attributesConcern]);
        else callback();
    }

    const children = childrenConcern.map(({ selector, action }) => {
        return {
            selector,
            delayedAction: way === 'debounce' ? debounce(action, delay) : way === 'throttle' ? throttle(action, delay) : action,
        };
    });

    const targetObserver = new MutationObserver(mutations => {
        if (anyMutation) {
            delayedCallback();
        } else {
            children.forEach(child => {
                const childMutation = mutations.find(el => (el.target as HTMLElement).matches(child.selector));
                if (childMutation) child.delayedAction(childMutation.target);
            });

            if (attributesConcern) {
                const combinedSelector = typeof selector === 'string' ? selector : combineSelectors(selector);
                const attributesMutation = mutations.find(el => {
                    return (el.target as HTMLElement).matches(combinedSelector) && (!strictMode || el.attributeName === attributesConcern);
                });
                if (attributesMutation) delayedCallback((attributesMutation.target as IndexedByStringElement)[attributesConcern]);
            }
        }
    });

    targetObserver.observe(selectorTargetElement, { childList: childrenConcern.length > 0, attributes: !!attributesConcern, subtree: childrenConcern.length > 0, ...manualSetupOptions });
    return targetObserver;
}

export interface WaitOptions {
    root?: HTMLElement;
    timeout?: number;
    signal?: AbortSignal;
}

export type ElementWaitResult = { status: 'found'; element: HTMLElement } | { status: 'timeout' } | { status: 'aborted' };
export type WindowPropertyWaitResult = { status: 'loaded'; available: boolean } | { status: 'timeout' } | { status: 'aborted' };

export function waitElementFinishLoading(selector: string | CommonSelectors, options: WaitOptions = {}): Promise<ElementWaitResult> {
    const existingElement = getElement(selector);
    if (existingElement) return Promise.resolve({ status: 'found', element: existingElement });
    if (options.signal?.aborted) return Promise.resolve({ status: 'aborted' });

    return new Promise(resolve => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const observer = new MutationObserver(() => {
            const targetElement = getElement(selector);
            if (targetElement) finish({ status: 'found', element: targetElement });
        });
        const abort = () => finish({ status: 'aborted' });
        const finish = (result: ElementWaitResult) => {
            if (settled) return;
            settled = true;
            observer.disconnect();
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            options.signal?.removeEventListener('abort', abort);
            resolve(result);
        };

        options.signal?.addEventListener('abort', abort, { once: true });
        if (options.timeout !== undefined) timeoutId = setTimeout(() => finish({ status: 'timeout' }), options.timeout);
        observer.observe(options.root || body, { childList: true, subtree: true });
    });
}

export function determineWindowPropertyIsLoaded(propertyName: string | string[], options: Omit<WaitOptions, 'root'> = {}): Promise<WindowPropertyWaitResult> {
    const propertyNames = Array.isArray(propertyName) ? propertyName : [propertyName];
    const propertiesAvailable = () => propertyNames.every(property => Object.prototype.hasOwnProperty.call(windowProxy, property));
    if (propertiesAvailable() || document.readyState === 'complete') return Promise.resolve({ status: 'loaded', available: propertiesAvailable() });
    if (options.signal?.aborted) return Promise.resolve({ status: 'aborted' });

    return new Promise(resolve => {
        let settled = false;
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const finish = (result: WindowPropertyWaitResult) => {
            if (settled) return;
            settled = true;
            windowProxy.removeEventListener('load', loaded);
            options.signal?.removeEventListener('abort', abort);
            if (timeoutId !== undefined) clearTimeout(timeoutId);
            resolve(result);
        };
        const loaded = () => finish({ status: 'loaded', available: propertiesAvailable() });
        const abort = () => finish({ status: 'aborted' });

        windowProxy.addEventListener('load', loaded, { once: true });
        options.signal?.addEventListener('abort', abort, { once: true });
        if (options.timeout !== undefined) timeoutId = setTimeout(() => finish({ status: 'timeout' }), options.timeout);
    });
}
