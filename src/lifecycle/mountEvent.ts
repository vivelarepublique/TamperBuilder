import { waitElementFinishLoading, determineWindowPropertyIsLoaded } from '../common/utils/monitoringElement';
import { updateCssRules, updateBackgroundImage, createNewURLCookieAfterMounted } from './beforeMount';
import { baidu, bing, google, bindURLChangeEvent } from './afterMount';
import { hostname } from '../common/alias';

const initializationTimeout = 30 * 1000;

export async function beforeMountEvent() {
    const propertyController = new AbortController();
    const elementController = new AbortController();
    const init = await Promise.race([
        determineWindowPropertyIsLoaded('$', { timeout: initializationTimeout, signal: propertyController.signal }),
        waitElementFinishLoading({ tagName: 'body' }, { timeout: initializationTimeout, signal: elementController.signal }),
    ]);
    propertyController.abort();
    elementController.abort();
    if (init.status === 'timeout' || init.status === 'aborted') return;

    updateCssRules(/*css*/ `
        /* For Baidu */
        div#s_top_wrap,
        div#bottom_layer {
            background-color: rgba(0, 0, 0, 0) !important;
        }

        div#s_wrap,
        div#s-hotsearch-wrapper {
            display: none !important;
        }

        /* For Google */
        div#gb,
        div[role="contentinfo"], input[type="submit"] {
            background-color: rgba(0, 0, 0, 0) !important;
        }

        /* For Bing */
        div.bottom_row.widget,
        div.below_sbox {
            display: none !important;
        }
        `);

    if (!hostname.includes('bing.com') && !location.search) {
        await updateBackgroundImage();
        void createNewURLCookieAfterMounted().catch(() => {
            console.warn('Unable to refresh the background cookie; preserving the current background.');
        });
    }
}

export function afterMountEvent() {
    bindURLChangeEvent();

    switch (hostname) {
        case 'www.baidu.com':
            baidu();
            break;
        case 'www.bing.com':
            bing();
            break;
        case 'www.google.com':
            google();
            break;
    }
}
