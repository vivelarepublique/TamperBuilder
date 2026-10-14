import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.hoisted(() => vi.fn());
const treeShakingMock = vi.hoisted(() => vi.fn());

vi.mock('node-fetch', () => ({ default: fetchMock }));
vi.mock('../../plugin/vite-plugin-link-css-tree-shaking/utilities', () => ({ default: treeShakingMock }));

import linkCssTreeShakingPlugin from '../../plugin/vite-plugin-link-css-tree-shaking';
import { parseIndexHTML } from '../../plugin/vite-plugin-link-css-tree-shaking/utilities/parse';
import { readLocalFile, readRemoteResource } from '../../plugin/vite-plugin-link-css-tree-shaking/utilities/preprocess';

const fixturesDirectory = fileURLToPath(new URL('../fixtures', import.meta.url));
const remoteCssUrl = 'https://fixtures.invalid/styles.min.css';

async function runPluginGenerateBundle() {
    const plugin = linkCssTreeShakingPlugin({ componentsFilesPath: [] });
    if (typeof plugin.generateBundle !== 'function') {
        throw new Error('Expected generateBundle to be a function');
    }
    await plugin.generateBundle.call({ emitFile: vi.fn() } as never, {} as never, {} as never, false);
}

describe('external CSS failure handling', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        treeShakingMock.mockReset();
    });

    it('throws on a non-2xx response without contacting the network', async () => {
        fetchMock.mockResolvedValue({
            ok: false,
            status: 503,
            url: remoteCssUrl,
        });

        await expect(readRemoteResource(remoteCssUrl)).rejects.toThrow('HTTP 503');
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('throws when a remote stylesheet is empty', async () => {
        fetchMock.mockResolvedValue({
            ok: true,
            status: 200,
            text: vi.fn().mockResolvedValue(''),
            url: remoteCssUrl,
        });

        await expect(readRemoteResource(remoteCssUrl)).rejects.toThrow('CSS resource is empty');
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
