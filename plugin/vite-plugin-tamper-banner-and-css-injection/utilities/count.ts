import { uniq } from '../public/index.ts';

export const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;

export function countAllUniqueHostnames(code: string): string[] {
    const urls = code.match(urlRegex);
    return urls ? uniq(urls.map(url => new URL(url).hostname)) : [];
}

export function countAllUniqueGrants(code: string): string[] {
    const grantRegex = /(GM_[a-zA-Z]+)|unsafeWindow|(window\.(onurlchange|close|focus))/g;
    const grants = code.match(grantRegex);
    return grants ? uniq(grants) : [];
}
