import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExternalCssPolicy } from '../../plugin/vite-plugin-link-css-tree-shaking/interfaces';

const fetchMock = vi.hoisted(() => vi.fn());
const treeShakingMock = vi.hoisted(() => vi.fn());

vi.mock('node-fetch', () => ({ default: fetchMock }));
vi.mock('../../plugin/vite-plugin-link-css-tree-shaking/utilities', () => ({ default: treeShakingMock }));

import linkCssTreeShakingPlugin from '../../plugin/vite-plugin-link-css-tree-shaking';
import { parseIndexHTML } from '../../plugin/vite-plugin-link-css-tree-shaking/utilities/parse';
import { readLocalFile, readRemoteResource } from '../../plugin/vite-plugin-link-css-tree-shaking/utilities/preprocess';

const fixturesDirectory = fileURLToPath(new URL('../fixtures', import.meta.url));
const remoteCssUrl = 'https://fixtures.invalid/styles.min.css';
const cssBytes = Buffer.from('body{margin:0}');
const cssDigest = createHash('sha256').update(cssBytes).digest();
const policy: ExternalCssPolicy = { timeoutMs: 1000, maxResponseBytes: 1024, maxRedirects: 1, allowedRedirectOrigins: [] };

function mockResponse(status: number, body = cssBytes, contentType = 'text/css') {
    return {
        body: Readable.from([body]),
        headers: new Headers({ 'content-type': contentType, 'content-length': String(body.length) }),
        ok: status >= 200 && status < 300,
        status,
        url: remoteCssUrl,
    };
}

async function runPluginGenerateBundle() {
    const plugin = linkCssTreeShakingPlugin({ componentsFilesPath: [] });
    if (typeof plugin.generateBundle !== 'function') throw new Error('Expected generateBundle to be a function');
    await plugin.generateBundle.call({ emitFile: vi.fn() } as never, {} as never, {} as never, false);
}

describe('external CSS failure handling', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        treeShakingMock.mockReset();
    });

    it('throws on a non-2xx response without contacting the network', async () => {
        fetchMock.mockResolvedValue(mockResponse(503));

        await expect(readRemoteResource(remoteCssUrl, cssDigest, policy)).rejects.toThrow('HTTP 503');
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('throws when a remote stylesheet is empty', async () => {
        fetchMock.mockResolvedValue(mockResponse(200, Buffer.alloc(0)));

        await expect(readRemoteResource(remoteCssUrl, createHash('sha256').update('').digest(), policy)).rejects.toThrow('CSS resource is empty');
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('throws when a local stylesheet is empty', () => {
        expect(() => readLocalFile(path.join(fixturesDirectory, 'empty.min.css'))).toThrow('CSS resource is empty');
    });

    it('throws when index HTML cannot be parsed', async () => {
        await expect(parseIndexHTML(path.join(fixturesDirectory, 'malformed-index.html'))).rejects.toThrow('Unable to parse');
    });

    it('propagates tree-shaking failures from the build plugin', async () => {
        treeShakingMock.mockRejectedValue(new Error('HTTP 503'));
        await expect(runPluginGenerateBundle()).rejects.toThrow('HTTP 503');
    });
});
