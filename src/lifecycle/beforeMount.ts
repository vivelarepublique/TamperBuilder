import type { RequestFailureKind } from '../common/interface/request';
import { httpRequest } from '../common/utils/tamperMonkeyFunction';
import { getTodayByYYYYMMDD } from '../common/utils/date';
import { createElementWithAttributes } from '../common/utils/elementBasic';
import { hasCookie, setCookie, getCookie } from '../common/utils/browserCookies';
import { body, head, language } from '../common/alias';

export type BackgroundUpdateResult = { ok: true; url: string } | { ok: false; failure: RequestFailureKind };

function saveURLToCookie(url: string) {
    setCookie('backgroundImageURL', url, { end: Infinity });
}

function warnBackgroundFailure(action: string, failure: RequestFailureKind) {
    console.warn(`Unable to ${action}; preserving the current background.`, failure);
}

async function getBackgroundImageURLFromWeb(): Promise<BackgroundUpdateResult> {
    const baseURL = `https://dailybing.com/api/v1/${getTodayByYYYYMMDD()}${language.toLowerCase()}FHD1920`;
    const picture = await httpRequest({ url: baseURL, method: 'GET' });
    if (!picture.ok) return { ok: false, failure: picture.failure };

    saveURLToCookie(picture.finalUrl);
    return { ok: true, url: picture.finalUrl };
}

function getBackgroundImageFromCookie() {
    return getCookie('backgroundImageURL');
}

export async function updateBackgroundImage(): Promise<BackgroundUpdateResult> {
    const savedURL = hasCookie('backgroundImageURL') ? getBackgroundImageFromCookie() : null;
    const backgroundResult: BackgroundUpdateResult = savedURL ? { ok: true, url: savedURL } : await getBackgroundImageURLFromWeb();
    if (!backgroundResult.ok) {
        warnBackgroundFailure('load a new background', backgroundResult.failure);
        return backgroundResult;
    }

    Object.assign(body.style, {
        backgroundImage: `url(${backgroundResult.url})`,
        backgroundRepeat: 'round',
        height: '100vh',
        width: '100vw',
    });
    return backgroundResult;
}

export async function createNewURLCookieAfterMounted(): Promise<BackgroundUpdateResult> {
    const result = await getBackgroundImageURLFromWeb();
    if (!result.ok) warnBackgroundFailure('refresh the background cookie', result.failure);
    return result;
}

export function updateCssRules(rules: string) {
    const style = createElementWithAttributes('style', {
        props: {
            type: 'text/css',
            textContent: rules,
        },
    });
    head.appendChild(style);
}
