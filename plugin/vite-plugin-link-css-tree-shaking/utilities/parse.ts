import fs from 'node:fs';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { isURL } from './judgement.ts';
import { readLocalFile, readRemoteResource } from './preprocess.ts';
import { createCache, getCache, existsCache, pickupCacheName } from './cache.ts';
import type { HTMLStructure } from '../interfaces/index.ts';

const unpairedTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

function requireCssContent(content: string, source: string): string {
    if (content.trim().length === 0) {
        throw new Error(`CSS resource is empty: ${source}`);
    }
    return content;
}

async function readLinkedCss(href: string): Promise<string> {
    if (!href) {
        throw new Error('Stylesheet link is missing an href');
    }
    if (!isURL(href)) {
        return readLocalFile(href);
    }

    const fileName = pickupCacheName(href);
    if (!fileName) {
        throw new Error(`Unable to determine a cache file name for ${href}`);
    }
    if (existsCache(fileName)) {
        return requireCssContent(getCache(fileName), href);
    }

    console.log(`The css file:${fileName} is for the first build and may take longer.`);
    const data = await readRemoteResource(href);
    createCache(fileName, data);
    return data;
}

export async function parseIndexHTML(filePath = 'index.html'): Promise<string> {
    const html = fs.readFileSync(filePath, 'utf8');
    const validation = XMLValidator.validate(html, { unpairedTags });
    if (validation !== true) {
        throw new Error(`Unable to parse ${filePath}: ${validation.err.msg}`);
    }

    const options = {
        attributeNamePrefix: '__',
        ignoreAttributes: false,
        unpairedTags,
        stopNodes: ['*.pre', '*.script'],
        processEntities: true,
        htmlEntities: true,
    };

    const parser = new XMLParser(options);
    let data: HTMLStructure;
    try {
        data = parser.parse(html) as HTMLStructure;
    } catch (error) {
        throw new Error(`Unable to parse ${filePath}`, { cause: error });
    }

    if (!data.html?.head) {
        throw new Error(`Unable to parse ${filePath}: missing html/head structure`);
    }

    const link = data.html.head.link;
    if (!link) return '';

    const links = Array.isArray(link) ? link : [link];
    const contentArray: string[] = [];
    for (const item of links) {
        contentArray.push(await readLinkedCss(item.__href));
    }

    return contentArray.join('');
}
