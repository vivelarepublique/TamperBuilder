/// <reference path="../../declaration/tampermonkey.d.ts" />

import type { HttpRequestParameters, RequestFailure, RequestFailureKind, RequestHeaders, RequestResult } from '../interface/request';

const defaultTimeout = 30 * 1000;

interface ResponseMetadata {
    status: number;
    headers: RequestHeaders;
    finalUrl: string;
    contentType: string;
}

function getContentType(headers: RequestHeaders): string {
    return headers['content-type']?.split(';', 1)[0].trim().toLowerCase() || '';
}

function parseRawHeaders(rawHeaders: string): RequestHeaders {
    return rawHeaders.split(/\r?\n/).reduce<Record<string, string>>((headers, line) => {
        const separator = line.indexOf(':');
        if (separator > 0) headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
        return headers;
    }, {});
}

function parseFetchHeaders(headers: Headers): RequestHeaders {
    const parsed: Record<string, string> = {};
    headers.forEach((value, name) => {
        parsed[name.toLowerCase()] = value;
    });
    return parsed;
}

function failure(metadata: ResponseMetadata, kind: RequestFailureKind, message: string): RequestFailure {
    return { ok: false, failure: kind, message, ...metadata };
}

function emptyMetadata(url: string): ResponseMetadata {
    return { status: 0, headers: {}, finalUrl: url, contentType: '' };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown request error';
}

function parseText(text: string, contentType: string): unknown {
    if (contentType === 'application/json' || contentType.endsWith('+json')) return JSON.parse(text);
    if (contentType === 'application/xml' || contentType === 'text/xml' || contentType.endsWith('+xml')) {
        const document = new DOMParser().parseFromString(text, 'application/xml');
        if (document.querySelector('parsererror')) throw new Error('Invalid XML response');
        return document;
    }
    if (contentType === 'text/html') return new DOMParser().parseFromString(text, 'text/html');
    return text;
}

async function requestWithFetch<T>(request: HttpRequestParameters): Promise<RequestResult<T>> {
    const { url, method, headers, data, redirect, timeout = defaultTimeout, anonymous, signal } = request;
    const controller = new AbortController();
    let timedOut = false;
    let externallyAborted = false;

    if (signal?.aborted) return failure(emptyMetadata(url), 'abort', 'Request aborted');

    const abortFromSignal = () => {
        externallyAborted = true;
        controller.abort();
    };
    signal?.addEventListener('abort', abortFromSignal, { once: true });
    const timeoutId = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeout);

    try {
        const response = await fetch(url, {
            method,
            headers,
            body: data && method !== 'GET' && method !== 'HEAD' ? data : undefined,
            redirect,
            signal: controller.signal,
            credentials: anonymous === false ? 'include' : 'omit',
        });
        const parsedHeaders = parseFetchHeaders(response.headers);
        const metadata: ResponseMetadata = {
            status: response.status,
            headers: parsedHeaders,
            finalUrl: response.url || url,
            contentType: getContentType(parsedHeaders),
        };
        if (!response.ok || response.status < 200 || response.status >= 300) return failure(metadata, 'http', `HTTP ${response.status}`);

        try {
            let parsed: unknown;
            if (request.responseType === 'arraybuffer') parsed = await response.arrayBuffer();
            else if (request.responseType === 'blob') parsed = await response.blob();
            else if (request.responseType === 'stream') parsed = response.body;
            else {
                const text = await response.text();
                parsed = request.responseType === 'json' ? JSON.parse(text) : parseText(text, metadata.contentType);
            }
            return { ok: true, data: parsed as T, ...metadata };
        } catch (error) {
            return failure(metadata, 'parse', errorMessage(error));
        }
    } catch (error) {
        const metadata = emptyMetadata(url);
        if (timedOut) return failure(metadata, 'timeout', 'Request timed out');
        if (externallyAborted || signal?.aborted) return failure(metadata, 'abort', 'Request aborted');
        return failure(metadata, 'network', errorMessage(error));
    } finally {
        clearTimeout(timeoutId);
        signal?.removeEventListener('abort', abortFromSignal);
    }
}

function requestWithGM<T>(request: HttpRequestParameters): Promise<RequestResult<T>> {
    const { signal, timeout = defaultTimeout, ...details } = request;
    if (signal?.aborted) return Promise.resolve(failure(emptyMetadata(request.url), 'abort', 'Request aborted'));

    return new Promise(resolve => {
        let settled = false;
        let abortHandle: Tampermonkey.AbortHandle<void> | undefined;
        const finish = (result: RequestResult<T>) => {
            if (settled) return;
            settled = true;
            signal?.removeEventListener('abort', abortFromSignal);
            resolve(result);
        };
        const finishWithoutResponse = (kind: Exclude<RequestFailureKind, 'http' | 'parse'>, message: string) => finish(failure(emptyMetadata(request.url), kind, message));
        const abortFromSignal = () => {
            abortHandle?.abort();
            finishWithoutResponse('abort', 'Request aborted');
        };
        signal?.addEventListener('abort', abortFromSignal, { once: true });

        try {
            abortHandle = GM_xmlhttpRequest({
                ...details,
                timeout,
                anonymous: request.anonymous ?? true,
                fetch: request.fetch ?? true,
                onload: response => {
                    const parsedHeaders = parseRawHeaders(response.responseHeaders);
                    const metadata: ResponseMetadata = {
                        status: response.status,
                        headers: parsedHeaders,
                        finalUrl: response.finalUrl || request.url,
                        contentType: getContentType(parsedHeaders),
                    };
                    if (response.status < 200 || response.status >= 300) {
                        finish(failure(metadata, 'http', `HTTP ${response.status}`));
                        return;
                    }

                    try {
                        let parsed: unknown;
                        if (request.responseType === 'arraybuffer' || request.responseType === 'blob' || request.responseType === 'stream') parsed = response.response;
                        else parsed = request.responseType === 'json' ? JSON.parse(response.responseText) : parseText(response.responseText, metadata.contentType);
                        finish({ ok: true, data: parsed as T, ...metadata });
                    } catch (error) {
                        finish(failure(metadata, 'parse', errorMessage(error)));
                    }
                },
                onabort: () => finishWithoutResponse('abort', 'Request aborted'),
                onerror: response => finishWithoutResponse('network', response.error || 'Network request failed'),
                ontimeout: () => finishWithoutResponse('timeout', 'Request timed out'),
            });
        } catch (error) {
            finishWithoutResponse('network', errorMessage(error));
        }
    });
}

export function httpRequest<T = unknown>(request: HttpRequestParameters): Promise<RequestResult<T>> {
    return typeof GM_xmlhttpRequest === 'undefined' ? requestWithFetch<T>(request) : requestWithGM<T>(request);
}

export type TamperWindow = Window & typeof globalThis & Record<string, unknown> & { scriptTemplate?: { search?: string } };

export const windowProxy = (typeof unsafeWindow === 'object' ? unsafeWindow : window) as TamperWindow;
