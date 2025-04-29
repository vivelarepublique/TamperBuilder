import { httpRequest } from '../common/utils/tamperMonkeyFunction';
import { getTodayByYYYYMMDD } from '../common/utils/date';
import { createElementWithAttributes } from '../common/utils/elementBasic';
import { hasCookie, setCookie, getCookie } from '../common/utils/browserCookies';
import { body, head, hostname, language } from '../common/alias';

function saveURLToCookie(url: string) {
    setCookie('backgroundImageURL', url, { end: Infinity });
}

async function getBackgroundImageURLFromWeb() {
    const localFlag = hostname === 'localhost' || hostname === '127.0.0.1';
    const baseURL = localFlag ? '/picture' : `https://dailybing.com/api/v1/${getTodayByYYYYMMDD()}${language.toLowerCase()}FHD1920`;

    const picture = await httpRequest({ url: baseURL, method: 'GET' });
    const url = localFlag ? picture.url : picture.finalUrl;
    console.log(url);

    if (url) saveURLToCookie(url);
    return url;
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
