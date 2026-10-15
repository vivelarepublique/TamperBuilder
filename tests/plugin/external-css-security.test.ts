import { createHash } from 'node:crypto';
import fs, { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalCssPolicy } from '../../plugin/vite-plugin-link-css-tree-shaking/interfaces';

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock('node-fetch', () => ({ default: fetchMock }));

import { createCache, getVerifiedCache, pickupCacheName } from '../../plugin/vite-plugin-link-css-tree-shaking/utilities/cache';
import { parseIndexHTML } from '../../plugin/vite-plugin-link-css-tree-shaking/utilities/parse';
import { readRemoteResource } from '../../plugin/vite-plugin-link-css-tree-shaking/utilities/preprocess';

const source = 'https://cdn.example.com/styles.min.css?theme=light#ignored';
const normalizedSource = 'https://cdn.example.com/styles.min.css?theme=light';
const cssBytes = Buffer.from('body{color:#123}');
const digest = createHash('sha256').update(cssBytes).digest();
const integrity = `sha256-${digest.toString('base64')}`;
const policy: ExternalCssPolicy = { timeoutMs: 1000, maxResponseBytes: 1024, maxRedirects: 2, allowedRedirectOrigins: [] };
const temporaryDirectories: string[] = [];

function response(url = normalizedSource, body = cssBytes, headers: Record<string, string> = { 'content-type': 'text/css' }, status = 200) {
    return {
        body: Readable.from([body]),
        headers: new Headers(headers),
        ok: status >= 200 && status < 300,
        status,
        url,
    };
}

function createHtml(integrityAttribute = ` integrity="${integrity}"`): { cacheDirectory: string; htmlPath: string } {
    const directory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-css-'));
    temporaryDirectories.push(directory);
    const htmlPath = path.join(directory, 'index.html');
    writeFileSync(htmlPath, `<html><head><link rel="stylesheet" href="${source}"${integrityAttribute} /></head><body></body></html>`);
    return { cacheDirectory: path.join(directory, 'cache'), htmlPath };
}

beforeEach(() => fetchMock.mockReset());
afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true });
});

describe('remote CSS security policy', () => {
    it.each(['', ' integrity="sha384-AAAA"', ' integrity="sha256-not-base64"'])('rejects missing or malformed integrity before fetch: %s', async integrityAttribute => {
        const fixture = createHtml(integrityAttribute);
        await expect(parseIndexHTML(fixture.htmlPath, { externalCssPolicy: policy, cacheDirectory: fixture.cacheDirectory })).rejects.toThrow(/integrity metadata/);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a digest mismatch', async () => {
        fetchMock.mockResolvedValue(response());
        await expect(readRemoteResource(source, Buffer.alloc(32), policy)).rejects.toThrow('integrity mismatch');
    });

    it('rejects unsupported MIME types and invalid UTF-8', async () => {
        fetchMock.mockResolvedValueOnce(response(normalizedSource, cssBytes, { 'content-type': 'text/html' }));
        await expect(readRemoteResource(source, digest, policy)).rejects.toThrow('unsupported Content-Type');

        const invalidUtf8 = Buffer.from([0xc3, 0x28]);
        fetchMock.mockResolvedValueOnce(response(normalizedSource, invalidUtf8));
        await expect(readRemoteResource(source, createHash('sha256').update(invalidUtf8).digest(), policy)).rejects.toThrow('not valid UTF-8');
    });

    it('destroys response bodies rejected before consumption', async () => {
        async function expectDestroyed(rejectedResponse: ReturnType<typeof response>, expectedError: string, selectedPolicy = policy) {
            const destroySpy = vi.spyOn(rejectedResponse.body, 'destroy');
            fetchMock.mockResolvedValueOnce(rejectedResponse);
            await expect(readRemoteResource(source, digest, selectedPolicy)).rejects.toThrow(expectedError);
            expect(destroySpy).toHaveBeenCalledOnce();
        }

        await expectDestroyed(response('https://cdn.example.com/changed.min.css'), 'changed unexpectedly');
        await expectDestroyed(response(normalizedSource, cssBytes, {}, 500), 'HTTP 500');
        await expectDestroyed(response(normalizedSource, cssBytes, {}), 'unsupported Content-Type (missing)');
        await expectDestroyed(response(normalizedSource, cssBytes, { 'content-type': 'text/html' }), 'unsupported Content-Type text/html');
        await expectDestroyed(response(normalizedSource, cssBytes, {}, 302), 'missing a Location header');
        await expectDestroyed(response(normalizedSource, cssBytes, { location: 'http://cdn.example.com/styles.min.css' }, 302), 'must use HTTPS');
        await expectDestroyed(response(normalizedSource, cssBytes, { location: 'https://assets.example.net/styles.min.css' }, 302), 'redirect origin is not allowed');
        await expectDestroyed(response(normalizedSource, cssBytes, { location: '/again.min.css' }, 302), 'exceeded 0 redirects', {
            ...policy,
            maxRedirects: 0,
        });
        await expectDestroyed(response(normalizedSource, cssBytes, { 'content-type': 'text/css', 'content-length': 'invalid' }), 'invalid Content-Length');
        await expectDestroyed(response(normalizedSource, cssBytes, { 'content-type': 'text/css', 'content-length': '2048' }), '1024-byte limit');
    });

    it('enforces declared and streaming response size limits', async () => {
        fetchMock.mockResolvedValueOnce(response(normalizedSource, cssBytes, { 'content-type': 'text/css', 'content-length': '2048' }));
        await expect(readRemoteResource(source, digest, policy)).rejects.toThrow('1024-byte limit');

        fetchMock.mockResolvedValueOnce(response(normalizedSource, Buffer.alloc(1025), { 'content-type': 'text/css' }));
        await expect(readRemoteResource(source, digest, policy)).rejects.toThrow('1024-byte limit');
    });

    it('blocks cross-origin redirects unless explicitly allowed', async () => {
        fetchMock.mockResolvedValueOnce(response(normalizedSource, Buffer.alloc(0), { location: 'https://assets.example.net/styles.min.css' }, 302));
        await expect(readRemoteResource(source, digest, policy)).rejects.toThrow('redirect origin is not allowed');

        fetchMock
            .mockResolvedValueOnce(response(normalizedSource, Buffer.alloc(0), { location: 'https://assets.example.net/styles.min.css' }, 302))
            .mockResolvedValueOnce(response('https://assets.example.net/styles.min.css'));
        await expect(readRemoteResource(source, digest, { ...policy, allowedRedirectOrigins: ['https://assets.example.net'] })).resolves.toMatchObject({ rawBytes: cssBytes });
    });

    it('enforces redirect limits and HTTPS destinations', async () => {
        fetchMock.mockResolvedValue(response(normalizedSource, Buffer.alloc(0), { location: '/again.min.css' }, 302));
        await expect(readRemoteResource(source, digest, { ...policy, maxRedirects: 0 })).rejects.toThrow('exceeded 0 redirects');

        fetchMock.mockResolvedValueOnce(response(normalizedSource, Buffer.alloc(0), { location: 'http://cdn.example.com/styles.min.css' }, 302));
        await expect(readRemoteResource(source, digest, policy)).rejects.toThrow('must use HTTPS');
    });

    it('reports in-flight timeout and caller cancellation distinctly', async () => {
        vi.useFakeTimers();
        try {
            fetchMock.mockImplementationOnce(() => new Promise(() => undefined));
            const timeoutExpectation = expect(readRemoteResource(source, digest, { ...policy, timeoutMs: 5 })).rejects.toThrow('timed out');
            await vi.advanceTimersByTimeAsync(5);
            await timeoutExpectation;

            fetchMock.mockImplementationOnce(() => new Promise(() => undefined));
            const controller = new AbortController();
            const cancellationExpectation = expect(readRemoteResource(source, digest, policy, controller.signal)).rejects.toThrow('cancelled');
            controller.abort();
            await cancellationExpectation;
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('remote CSS cache integrity', () => {
    it('keys cache entries by normalized origin, path, and query but not fragment', () => {
        expect(pickupCacheName(`${source}#other`)).toBe(pickupCacheName(source));
        expect(pickupCacheName(source)).not.toBe(pickupCacheName('https://other.example.com/styles.min.css?theme=light'));
        expect(pickupCacheName(source)).not.toBe(pickupCacheName('https://cdn.example.com/other.min.css?theme=light'));
        expect(pickupCacheName(source)).not.toBe(pickupCacheName('https://cdn.example.com/styles.min.css?theme=dark'));
    });

    it('discards corrupt cache bytes and replaces them only after a verified fetch', async () => {
        const fixture = createHtml();
        const name = pickupCacheName(source);
        fs.mkdirSync(fixture.cacheDirectory);
        writeFileSync(path.join(fixture.cacheDirectory, name), 'corrupt');
        fetchMock.mockResolvedValue(response());

        await expect(parseIndexHTML(fixture.htmlPath, { externalCssPolicy: policy, cacheDirectory: fixture.cacheDirectory })).resolves.toBe(cssBytes.toString());
        expect(readFileSync(path.join(fixture.cacheDirectory, name))).toEqual(cssBytes);
    });

    it('fails closed when a cache write cannot be renamed and cleans its temporary file', () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-cache-'));
        temporaryDirectories.push(directory);
        const name = pickupCacheName(source);
        writeFileSync(path.join(directory, name), 'existing-valid-entry');
        vi.spyOn(fs, 'renameSync').mockImplementation(() => {
            throw new Error('rename failed');
        });

        expect(() => createCache(name, cssBytes, directory)).toThrow('Unable to atomically write');
        expect(readFileSync(path.join(directory, name), 'utf8')).toBe('existing-valid-entry');
        expect(readdirSync(directory)).toEqual([name]);
    });

    it('does not replace a valid entry when a cache write is cancelled', () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-cache-'));
        temporaryDirectories.push(directory);
        const name = pickupCacheName(source);
        writeFileSync(path.join(directory, name), 'existing-valid-entry');
        const controller = new AbortController();
        controller.abort();

        expect(() => createCache(name, cssBytes, directory, controller.signal)).toThrow('Unable to atomically write');
        expect(readFileSync(path.join(directory, name), 'utf8')).toBe('existing-valid-entry');
        expect(readdirSync(directory)).toEqual([name]);
    });

    it('returns only cache bytes matching the expected digest', () => {
        const directory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-cache-'));
        temporaryDirectories.push(directory);
        const name = pickupCacheName(source);
        createCache(name, cssBytes, directory);
        expect(getVerifiedCache(name, digest, directory)).toEqual(cssBytes);
        expect(getVerifiedCache(name, Buffer.alloc(32), directory)).toBeUndefined();
        expect(fs.existsSync(path.join(directory, name))).toBe(false);
    });
});
