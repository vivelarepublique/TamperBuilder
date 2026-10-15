import { createHash } from 'node:crypto';
import fs from 'node:fs';
import fetch, { type Response } from 'node-fetch';
import type { ExternalCssPolicy } from '../interfaces/index.ts';
import { isMinCssAndExists } from './judgement.ts';
import { removeCommentsAndCharset } from './replace.ts';

const CSS_MIME_TYPES = new Set(['text/css']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export interface RemoteCssResource {
    content: string;
    rawBytes: Buffer;
}

function processCssContent(content: string, source: string): string {
    const processedContent = removeCommentsAndCharset(content);
    if (processedContent.trim().length === 0) {
        throw new Error(`CSS resource is empty: ${source}`);
    }
    return processedContent;
}

export function processRemoteCssBytes(rawBytes: Buffer, source: string): string {
    if (rawBytes.length === 0) throw new Error(`CSS resource is empty: ${source}`);

    let content: string;
    try {
        content = new TextDecoder('utf-8', { fatal: true }).decode(rawBytes);
    } catch (error) {
        throw new Error(`Remote CSS resource is not valid UTF-8: ${source}`, { cause: error });
    }
    return processCssContent(content, source);
}

export function readLocalFile(filePath: string | string[]): string {
    if (Array.isArray(filePath)) {
        return filePath.reduce((previous, current) => {
            if (!isMinCssAndExists(current)) {
                throw new Error(`Local CSS resource is missing or not a .min.css file: ${current}`);
            }
            const content = fs.readFileSync(current, 'utf-8');
            return previous + processCssContent(content, current);
        }, '');
    }

    if (!isMinCssAndExists(filePath)) {
        throw new Error(`Local CSS resource is missing or not a .min.css file: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return processCssContent(content, filePath);
}

function validateRemoteUrl(value: string, source: string): URL {
    let url: URL;
    try {
        url = new URL(value);
    } catch (error) {
        throw new Error(`Remote CSS URL is invalid: ${source}`, { cause: error });
    }
    if (url.protocol !== 'https:') throw new Error(`Remote CSS URL must use HTTPS: ${source}`);
    if (url.username || url.password) throw new Error(`Remote CSS URL must not contain credentials: ${source}`);
    url.hash = '';
    return url;
}

function redirectTarget(response: Response, currentUrl: URL): URL | undefined {
    if (!REDIRECT_STATUSES.has(response.status)) return undefined;
    const location = response.headers.get('location');
    if (!location) throw new Error(`Remote CSS redirect from ${currentUrl.href} is missing a Location header`);
    return validateRemoteUrl(new URL(location, currentUrl).href, location);
}

function destroyResponseBody(response: Response): void {
    (response.body as { destroy?: () => void } | null)?.destroy?.();
}

async function readBoundedBody(response: Response, source: string, maxResponseBytes: number): Promise<Buffer> {
    const contentLength = response.headers.get('content-length');
    if (contentLength !== null) {
        const declaredLength = Number(contentLength);
        if (!Number.isSafeInteger(declaredLength) || declaredLength < 0) {
            throw new Error(`Remote CSS resource has an invalid Content-Length: ${source}`);
        }
        if (declaredLength > maxResponseBytes) {
            throw new Error(`Remote CSS resource exceeds the ${maxResponseBytes}-byte limit: ${source}`);
        }
    }
    if (!response.body) throw new Error(`Remote CSS resource has no response body: ${source}`);

    const chunks: Buffer[] = [];
    let totalBytes = 0;
    for await (const chunk of response.body) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += bytes.length;
        if (totalBytes > maxResponseBytes) {
            throw new Error(`Remote CSS resource exceeds the ${maxResponseBytes}-byte limit: ${source}`);
        }
        chunks.push(bytes);
    }
    return Buffer.concat(chunks, totalBytes);
}

export async function readRemoteResource(
    source: string,
    expectedDigest: Buffer,
    policy: ExternalCssPolicy,
    callerSignal?: AbortSignal,
): Promise<RemoteCssResource> {
    const initialUrl = validateRemoteUrl(source, source);
    if (callerSignal?.aborted) throw new Error(`Remote CSS request was cancelled: ${source}`);
    const allowedOrigins = new Set([initialUrl.origin, ...policy.allowedRedirectOrigins]);
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), policy.timeoutMs);
    const signal = callerSignal ? AbortSignal.any([callerSignal, timeoutController.signal]) : timeoutController.signal;
    if (timeoutController.signal.aborted) {
        clearTimeout(timeout);
        throw new Error(`Remote CSS request timed out after ${policy.timeoutMs}ms: ${source}`);
    }

    let currentUrl = initialUrl;
    try {
        for (let redirects = 0; ; redirects += 1) {
            let response: Response;
            let rejectAbort: (reason?: unknown) => void = () => undefined;
            const abortRequest = new Promise<Response>((_resolve, reject) => {
                rejectAbort = reject;
            });
            const abortHandler = () => rejectAbort(new Error('request aborted'));
            signal.addEventListener('abort', abortHandler, { once: true });
            try {
                response = await Promise.race([fetch(currentUrl, { redirect: 'manual', signal }), abortRequest]);
            } catch (error) {
                if (callerSignal?.aborted) throw new Error(`Remote CSS request was cancelled: ${source}`, { cause: error });
                if (timeoutController.signal.aborted) throw new Error(`Remote CSS request timed out after ${policy.timeoutMs}ms: ${source}`, { cause: error });
                throw new Error(`Unable to load remote CSS resource ${source}: network request failed`, { cause: error });
            } finally {
                signal.removeEventListener('abort', abortHandler);
            }

            let consumedResponseBody = false;
            try {
                const reportedUrl = validateRemoteUrl(response.url || currentUrl.href, response.url || currentUrl.href);
                if (reportedUrl.href !== currentUrl.href) {
                    throw new Error(`Remote CSS response URL changed unexpectedly from ${currentUrl.href} to ${reportedUrl.href}`);
                }

                const nextUrl = redirectTarget(response, currentUrl);
                if (nextUrl) {
                    if (redirects >= policy.maxRedirects) {
                        throw new Error(`Remote CSS resource exceeded ${policy.maxRedirects} redirects: ${source}`);
                    }
                    if (!allowedOrigins.has(nextUrl.origin)) {
                        throw new Error(`Remote CSS redirect origin is not allowed: ${nextUrl.origin}`);
                    }
                    currentUrl = nextUrl;
                    continue;
                }

                if (!response.ok) throw new Error(`Unable to load remote CSS resource ${source}: HTTP ${response.status}`);
                const mimeType = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
                if (!mimeType || !CSS_MIME_TYPES.has(mimeType)) {
                    throw new Error(`Remote CSS resource has unsupported Content-Type ${mimeType || '(missing)'}: ${source}`);
                }

                let rawBytes: Buffer;
                try {
                    rawBytes = await readBoundedBody(response, source, policy.maxResponseBytes);
                    consumedResponseBody = true;
                } catch (error) {
                    if (callerSignal?.aborted) throw new Error(`Remote CSS request was cancelled: ${source}`, { cause: error });
                    if (timeoutController.signal.aborted) throw new Error(`Remote CSS request timed out after ${policy.timeoutMs}ms: ${source}`, { cause: error });
                    if (error instanceof Error && error.message.startsWith('Remote CSS resource')) throw error;
                    throw new Error(`Unable to read remote CSS response body: ${source}`, { cause: error });
                }
                const actualDigest = createHash('sha256').update(rawBytes).digest();
                if (!actualDigest.equals(expectedDigest)) {
                    throw new Error(`Remote CSS SHA-256 integrity mismatch: ${source}`);
                }
                return { content: processRemoteCssBytes(rawBytes, source), rawBytes };
            } finally {
                if (!consumedResponseBody) destroyResponseBody(response);
            }
        }
    } finally {
        clearTimeout(timeout);
    }
}
