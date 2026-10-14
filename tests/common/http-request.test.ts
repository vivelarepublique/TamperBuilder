// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpRequest } from '../../src/common/utils/tamperMonkeyFunction';

const url = 'https://example.test/resource';

function response(body: string, status = 200, contentType = 'text/plain', finalUrl = url): Response {
    const value = new Response(body, { status, headers: { 'content-type': contentType, 'x-result': 'yes' } });
    Object.defineProperty(value, 'url', { value: finalUrl });
    return value;
}

function gmResponse(body: string, status = 200, contentType = 'text/plain', finalUrl = url) {
    return {
        responseHeaders: `Content-Type: ${contentType}\r\nX-Result: yes`,
        response: body,
        responseText: body,
        responseXML: null,
        readyState: 4,
        status,
        statusText: '',
        finalUrl,
        context: {},
    };
}

function installGM(callback: (details: Record<string, unknown>) => void) {
    const abort = vi.fn();
    const gm = vi.fn((details: Record<string, unknown>) => {
        callback(details);
        return { abort };
    });
    vi.stubGlobal('GM_xmlhttpRequest', gm);
    return { gm, abort };
}

function invoke(details: Record<string, unknown>, callback: string, value?: unknown) {
    (details[callback] as (response?: unknown) => void)(value);
}

describe('httpRequest', () => {
    beforeEach(() => {
        vi.stubGlobal('GM_xmlhttpRequest', undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('passes headers and body through fetch and returns normalized JSON metadata', async () => {
        const fetchMock = vi.fn().mockResolvedValue(response('{"value":1}', 200, 'application/json; charset=utf-8', 'https://cdn.example.test/final'));
        vi.stubGlobal('fetch', fetchMock);

        const result = await httpRequest<{ value: number }>({ url, method: 'POST', headers: { Authorization: 'token' }, data: 'payload' });

        expect(fetchMock).toHaveBeenCalledWith(
            url,
            expect.objectContaining({ method: 'POST', headers: { Authorization: 'token' }, body: 'payload', credentials: 'omit' }),
        );
        expect(result).toEqual({
            ok: true,
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8', 'x-result': 'yes' },
            finalUrl: 'https://cdn.example.test/final',
            data: { value: 1 },
        });
    });

    it('passes headers and data in GM request fields and returns the same JSON shape', async () => {
        const { gm } = installGM(details => invoke(details, 'onload', gmResponse('{"value":1}', 200, 'application/json; charset=utf-8', 'https://cdn.example.test/final')));

        const result = await httpRequest<{ value: number }>({ url, method: 'POST', headers: { Authorization: 'token' }, data: 'payload' });

        expect(gm).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', url, headers: { Authorization: 'token' }, data: 'payload' }));
        expect(result).toEqual({
            ok: true,
            status: 200,
            headers: { 'content-type': 'application/json; charset=utf-8', 'x-result': 'yes' },
            finalUrl: 'https://cdn.example.test/final',
            data: { value: 1 },
        });
    });

    it('normalizes text, HTML, and XML parsing across transports', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response('plain')).mockResolvedValueOnce(response('<main>ok</main>', 200, 'text/html')).mockResolvedValueOnce(response('<root>ok</root>', 200, 'application/xml')));
        const fetchText = await httpRequest<string>({ url, method: 'GET' });
        const fetchHtml = await httpRequest<Document>({ url, method: 'GET' });
        const fetchXml = await httpRequest<Document>({ url, method: 'GET' });
        expect(fetchText.ok && fetchText.data).toBe('plain');
        expect(fetchHtml.ok && fetchHtml.data.querySelector('main')?.textContent).toBe('ok');
        expect(fetchXml.ok && fetchXml.data.querySelector('root')?.textContent).toBe('ok');

        const bodies = [gmResponse('plain'), gmResponse('<main>ok</main>', 200, 'text/html'), gmResponse('<root>ok</root>', 200, 'application/xml')];
        installGM(details => invoke(details, 'onload', bodies.shift()));
        const gmText = await httpRequest<string>({ url, method: 'GET' });
        const gmHtml = await httpRequest<Document>({ url, method: 'GET' });
        const gmXml = await httpRequest<Document>({ url, method: 'GET' });
        expect(gmText.ok && gmText.data).toBe('plain');
        expect(gmHtml.ok && gmHtml.data.querySelector('main')?.textContent).toBe('ok');
        expect(gmXml.ok && gmXml.data.querySelector('root')?.textContent).toBe('ok');
    });

    it.each([
        ['fetch', () => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('failure', 503)))],
        ['GM', () => installGM(details => invoke(details, 'onload', gmResponse('failure', 503)))],
    ])('returns a deterministic HTTP failure for %s', async (_transport, install) => {
        install();
        await expect(httpRequest({ url, method: 'GET' })).resolves.toMatchObject({ ok: false, failure: 'http', status: 503, finalUrl: url });
    });

    it.each([
        ['fetch', () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))],
        ['GM', () => installGM(details => invoke(details, 'onerror', { error: 'offline' }))],
    ])('returns a deterministic network failure for %s', async (_transport, install) => {
        install();
        await expect(httpRequest({ url, method: 'GET' })).resolves.toMatchObject({ ok: false, failure: 'network', status: 0 });
    });

    it.each([
        ['fetch', () => vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response('{bad', 200, 'application/json')))],
        ['GM', () => installGM(details => invoke(details, 'onload', gmResponse('{bad', 200, 'application/json')))],
    ])('returns a deterministic parse failure for %s', async (_transport, install) => {
        install();
        await expect(httpRequest({ url, method: 'GET' })).resolves.toMatchObject({ ok: false, failure: 'parse', status: 200 });
    });

    it('distinguishes fetch timeout from external abort and cleans timers', async () => {
        vi.useFakeTimers();
        vi.stubGlobal(
            'fetch',
            vi.fn((_requestUrl: string, init: RequestInit) =>
                new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })),
            ),
        );

        const timedOut = httpRequest({ url, method: 'GET', timeout: 10 });
        await vi.advanceTimersByTimeAsync(10);
        await expect(timedOut).resolves.toMatchObject({ ok: false, failure: 'timeout' });
        expect(vi.getTimerCount()).toBe(0);

        const controller = new AbortController();
        const aborted = httpRequest({ url, method: 'GET', signal: controller.signal });
        controller.abort();
        await expect(aborted).resolves.toMatchObject({ ok: false, failure: 'abort' });
        expect(vi.getTimerCount()).toBe(0);
    });

    it('normalizes GM timeout and abort and removes external abort handling', async () => {
        let pendingDetails: Record<string, unknown> = {};
        const { abort } = installGM(details => {
            pendingDetails = details;
        });
        const timedOut = httpRequest({ url, method: 'GET' });
        invoke(pendingDetails, 'ontimeout');
        await expect(timedOut).resolves.toMatchObject({ ok: false, failure: 'timeout' });

        const controller = new AbortController();
        const removeListener = vi.spyOn(controller.signal, 'removeEventListener');
        const aborted = httpRequest({ url, method: 'GET', signal: controller.signal });
        controller.abort();
        await expect(aborted).resolves.toMatchObject({ ok: false, failure: 'abort' });
        expect(abort).toHaveBeenCalledOnce();
        expect(removeListener).toHaveBeenCalledWith('abort', expect.any(Function));
    });
});
