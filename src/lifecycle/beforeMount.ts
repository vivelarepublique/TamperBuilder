import { httpRequest } from '../common/utils/tamperMonkeyFunction';
import { getElement, createElementWithAttributes } from '../common/utils/elementBasic';
import { hasCookie, setCookie, getCookie } from '../common/utils/browserCookies';
import { body, head, hostname } from '../common/alias';
import { urlRegex } from '../common/constant';

function saveURLToCookie(url: string) {
    setCookie('backgroundImageURL', url, { end: Infinity });
}

async function getBackgroundImageURLFromWeb() {
    const baseURL = hostname === 'localhost' || hostname === '127.0.0.1' ? '/picture' : 'https://www.bing.com/';

    const doc = await httpRequest({ url: baseURL, method: 'GET' });
    if (!doc) return '';

    const background = getElement({ tagName: 'div', className: 'img_cont' }, doc);

    const url = background?.style.backgroundImage?.match(/(?<=").+?(?=")/g)?.[0];
    const finalURL = url ? (urlRegex.test(url) ? url : `${baseURL}${url}`) : '';
    if (finalURL) saveURLToCookie(finalURL);
    return finalURL;
}

function getBackgroundImageFromCookie() {
    return getCookie('backgroundImageURL');
}

export async function updateBackgroundImage() {
    const backgroundImageURL = hasCookie('backgroundImageURL') ? getBackgroundImageFromCookie() : await getBackgroundImageURLFromWeb();

    Object.assign(body.style, {
        backgroundImage: `url(${backgroundImageURL})`,
        backgroundRepeat: 'round',
        height: '100vh',
        width: '100vw',
    });
}

export async function createNewURLCookieAfterMounted() {
    getBackgroundImageURLFromWeb();
}

export function updateCssRules(rules: string) {
    const style = createElementWithAttributes('style', {
        props: {
            type: 'text/css',
            innerHTML: rules,
        },
    });
    head.appendChild(style);
}
