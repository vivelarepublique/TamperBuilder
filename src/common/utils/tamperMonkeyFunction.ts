/// <reference path="../../declaration/tampermonkey.d.ts" />

import type { TampermonkeyWebRequestParameters } from '../interface/request';

function getContentType(headers: string): string {
    return headers.match(/[a-z]+\/[a-z]+(?=;\s?charset)/)?.join('') || '';
}

function responseOK(response: Response): boolean {
    return response.ok && response.status >= 200 && response.status < 300;
}

export async function httpRequest(request: TampermonkeyWebRequestParameters): Promise<any> {
    try {
        const defaultTimeout = 30 * 1000;
        const isBrowser = 'undefined' === typeof GM_xmlhttpRequest;

        const { url, method, headers, data, timeout, anonymous } = request;
        const noCookie = typeof anonymous === 'undefined' || anonymous;

        if (!isBrowser) {
            return new Promise(resolve => {
                const context: TampermonkeyWebRequestParameters = { url, method };
                if (headers) {
                    Object.assign(context, headers);
                }
                if (data && method != 'GET') {
                    Object.assign(context, data);
                }

                GM_xmlhttpRequest({
                    fetch: true,
                    timeout: timeout || defaultTimeout,
                    anonymous: noCookie,
                    ...context,
                    onload: response => {
                        const contentType = getContentType(response.responseHeaders);

                        if (contentType === 'application/json') {
                            resolve(JSON.parse(response.responseText));
                        } else if (contentType === 'application/xml' || contentType === 'text/xml' || contentType === 'text/html') {
                            resolve(response.responseXML);
                        } else {
                            resolve(response);
                        }
                    },
                    onabort: () => resolve(null),
                    onerror: _ => resolve(null),
                });
            });
        } else {
            const controller = new AbortController();

            const timeoutId = setTimeout(() => {
                controller.abort();
            }, timeout || defaultTimeout);

            const init: RequestInit = { method, signal: controller.signal, credentials: noCookie ? 'omit' : 'include' };
            if (headers) {
                Object.assign(init, headers);
            }
            if (data && method != 'GET') {
                Object.assign(init, { body: data });
            }

            const response = await fetch(url, init);
            clearTimeout(timeoutId);

            const ok = responseOK(response);
            if (!ok) return null;

            const contentType = getContentType(response.headers.get('content-type') || '');

            if (contentType === 'application/json') {
                return await response.json();
            } else if (contentType === 'application/xml' || contentType === 'text/xml' || contentType === 'text/html') {
                const xml = await response.text();
                return new DOMParser().parseFromString(xml, 'text/html');
            } else {
                return response;
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error('Request timed out.');
        } else if (error.name === 'ReferenceError') {
            console.log(error);
        } else {
            throw error;
        }
    }
}

export const windowProxy: {
    [key: string]: any;
} = typeof unsafeWindow === 'object' ? unsafeWindow : window;
