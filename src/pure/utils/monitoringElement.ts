import { ListenOptions } from '../types/mutations';
import { RealElement } from '../types/dom';
import { getElement } from './elementCRUD';
import { debounce, throttle } from './delayTools';
import { windowProxy } from './tamperMonkeyFunction';

const listenElementChanges = (selector: string, options: ListenOptions): MutationObserver => {
    const { anyMutation = false, callback = () => console.log('No action.'), attributesConcern, childrenConcern = [], immediateImplementation = false, triggerLimitation = { way: 'none', delay: 0 }, manualSetupOptions = {} } = options;

    if (anyMutation) Object.assign(manualSetupOptions, { childList: true, attributes: true, subtree: true });
    const { delay, way } = triggerLimitation;
    const delayedCallback = way === 'debounce' ? debounce(callback, delay) : way === 'throttle' ? throttle(callback, delay) : callback;

    const selectorTargetElement = getElement(selector) || document.body;

    if (immediateImplementation) {
        attributesConcern ? callback((selectorTargetElement as RealElement)[attributesConcern]) : callback();
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
                const childMutation = mutations.find(el => (el.target as Element).matches(child.selector));
                if (childMutation) child.delayedAction(childMutation.target);
            });

            if (attributesConcern) {
                const attributesMutation = mutations.find(el => (el.target as Element).matches(selector));
                attributesMutation && delayedCallback((attributesMutation.target as RealElement)[attributesConcern]);
            }
        }
    });

    targetObserver.observe(selectorTargetElement, { childList: childrenConcern.length > 0, attributes: !!attributesConcern, subtree: childrenConcern.length > 0, ...manualSetupOptions });
    return targetObserver;
};

const waitElementFinishLoading = (target: string): Promise<Element> => {
    return new Promise(resolve => {
        const bodyObserver = new MutationObserver(_ => {
            const targetElement = getElement(target);
            if (targetElement) {
                bodyObserver.disconnect();
                resolve(targetElement);
            }
        });
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });
};

const waitWindowProperties = (target: string): Promise<any> => {
    return new Promise(resolve => {
        windowProxy.addEventListener('load', () => {
            if (windowProxy[target as unknown as number]) {
                resolve(windowProxy[target as unknown as number]);
            }
        });
    });
};

export { listenElementChanges, waitElementFinishLoading, waitWindowProperties };
