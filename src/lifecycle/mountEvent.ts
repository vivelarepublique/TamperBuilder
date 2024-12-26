import { waitElementFinishLoading, determineWindowPropertyIsLoaded } from '../common/utils/monitoringElement';
import { updateCssRules, updateBackgroundImage, createNewURLCookieAfterMounted } from './beforeMount';
import { baidu, bing, google, bindURLChangeEvent } from './afterMount';
import { hostname } from '../common/alias';

export async function beforeMountEvent() {
    const init = await Promise.race([determineWindowPropertyIsLoaded('$'), waitElementFinishLoading({ tagName: 'body' })]);

    console.log(init);
    if (!init) return;

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
        updateBackgroundImage();
        createNewURLCookieAfterMounted();
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
