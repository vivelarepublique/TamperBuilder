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

    if (immediateImplementation) attributesConcern ? callback(selectorTargetElement[attributesConcern]) : callback();

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
                attributesMutation && delayedCallback((attributesMutation.target as IndexedByStringElement)[attributesConcern]);
            }
        }
    });

    targetObserver.observe(selectorTargetElement, { childList: childrenConcern.length > 0, attributes: !!attributesConcern, subtree: childrenConcern.length > 0, ...manualSetupOptions });
    return targetObserver;
}

export function waitElementFinishLoading(selector: string | CommonSelectors, refer?: HTMLElement): Promise<HTMLElement | null> {
    return new Promise(resolve => {
        getElement(selector) && resolve(getElement(selector));

        const bodyObserver = new MutationObserver(_ => {
            const targetElement = getElement(selector);
            if (targetElement) {
                bodyObserver.disconnect();
                resolve(targetElement);
            }
        });
        bodyObserver.observe(refer || body, { childList: true, subtree: true });
    });
}

export function determineWindowPropertyIsLoaded(propertyName: string | string[]): Promise<boolean> {
    return new Promise(resolve => windowProxy.addEventListener('load', () => (Array.isArray(propertyName) ? resolve(propertyName.every(property => windowProxy.hasOwnProperty(property))) : resolve(windowProxy.hasOwnProperty(propertyName)))));
}
