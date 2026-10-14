import fs from 'node:fs';
import fetch from 'node-fetch';
import { isMinCssAndExists } from './judgement.ts';
import { removeCommentsAndCharset } from './replace.ts';

function processCssContent(content: string, source: string): string {
    const processedContent = removeCommentsAndCharset(content);
    if (processedContent.trim().length === 0) {
        throw new Error(`CSS resource is empty: ${source}`);
    }
    return processedContent;
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

export async function readRemoteResource(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Unable to load remote CSS resource ${url}: HTTP ${response.status}`);
    }
    if (!response.url.endsWith('.min.css')) {
        throw new Error(`Remote resource is not a minified CSS file: ${url}`);
    }

    const content = await response.text();
    return processCssContent(content, url);
}
