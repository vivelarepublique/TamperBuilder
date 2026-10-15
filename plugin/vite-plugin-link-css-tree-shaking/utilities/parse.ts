import fs from 'node:fs';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { isURL } from './judgement.ts';
import { processRemoteCssBytes, readLocalFile, readRemoteResource } from './preprocess.ts';
import { createCache, getVerifiedCache, pickupCacheName } from './cache.ts';
import type { ExternalCssPolicy, HTMLStructure, StylesheetLink } from '../interfaces/index.ts';

const unpairedTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
const SHA256_SRI_PATTERN = /^sha256-([A-Za-z0-9+/]{43}=)$/;

export interface ParseIndexHTMLOptions {
    externalCssPolicy?: ExternalCssPolicy;
    signal?: AbortSignal;
    cacheDirectory?: string;
}

function parseSha256Integrity(integrity: string | undefined, source: string): Buffer {
    if (!integrity) throw new Error(`Remote stylesheet is missing SHA-256 integrity metadata: ${source}`);
    const match = integrity.match(SHA256_SRI_PATTERN);
    if (!match) throw new Error(`Remote stylesheet has invalid SHA-256 integrity metadata: ${source}`);
    const digest = Buffer.from(match[1], 'base64');
    if (digest.length !== 32) throw new Error(`Remote stylesheet has invalid SHA-256 integrity metadata: ${source}`);
    return digest;
}

async function readLinkedCss(link: StylesheetLink, options: ParseIndexHTMLOptions): Promise<string> {
    const href = link.__href;
    if (!href) throw new Error('Stylesheet link is missing an href');
    if (!isURL(href)) return readLocalFile(href);

    const expectedDigest = parseSha256Integrity(link.__integrity, href);
    if (!options.externalCssPolicy) throw new Error(`Remote CSS policy is required before accessing ${href}`);
    const fileName = pickupCacheName(href);
    const cachedBytes = getVerifiedCache(fileName, expectedDigest, options.cacheDirectory, options.externalCssPolicy.maxResponseBytes, options.signal);
    if (cachedBytes) return processRemoteCssBytes(cachedBytes, href);

    console.log(`The css file:${fileName} is for the first build and may take longer.`);
    const resource = await readRemoteResource(href, expectedDigest, options.externalCssPolicy, options.signal);
    createCache(fileName, resource.rawBytes, options.cacheDirectory, options.signal);
    return resource.content;
}

export async function parseIndexHTML(filePath = 'index.html', options: ParseIndexHTMLOptions = {}): Promise<string> {
    const html = fs.readFileSync(filePath, 'utf8');
    const validation = XMLValidator.validate(html, { unpairedTags });
    if (validation !== true) throw new Error(`Unable to parse ${filePath}: ${validation.err.msg}`);

    const parser = new XMLParser({
        attributeNamePrefix: '__',
        ignoreAttributes: false,
        unpairedTags,
        stopNodes: ['*.pre', '*.script'],
        processEntities: true,
        htmlEntities: true,
    });
    let data: HTMLStructure;
    try {
        data = parser.parse(html) as HTMLStructure;
    } catch (error) {
        throw new Error(`Unable to parse ${filePath}`, { cause: error });
    }
    if (!data.html?.head) throw new Error(`Unable to parse ${filePath}: missing html/head structure`);

    const link = data.html.head.link;
    if (!link) return '';
    const links = Array.isArray(link) ? link : [link];
    const contentArray: string[] = [];
    for (const item of links) contentArray.push(await readLinkedCss(item, options));
    return contentArray.join('');
}
