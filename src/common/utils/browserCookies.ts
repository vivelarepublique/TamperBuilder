export function hasCookie(key: string): boolean {
    return new RegExp('(?:^|;\\s*)' + encodeURIComponent(key).replace(/[-.+*]/g, '\\$&') + '\\s*\\=').test(document.cookie);
}

export function getCookie(key: string): string | null {
    return decodeURIComponent(document.cookie.replace(new RegExp('(?:(?:^|.*;)\\s*' + encodeURIComponent(key).replace(/[-.+*]/g, '\\$&') + '\\s*\\=\\s*([^;]*).*$)|^.*$'), '$1')) || null;
}

export function removeCookie(key: string, path: string, domain?: string): boolean {
    if (!key || !hasCookie(key)) return false;
    document.cookie = encodeURIComponent(key) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT' + (domain ? '; domain=' + domain : '') + (path ? '; path=' + path : '');
    return true;
}

export function setCookie(key: string, value: string, config?: { end?: string | number | Date; path?: string; domain?: string; secure?: boolean }): boolean {
    const { end, path, domain, secure } = config || {};
    if (!key || /^(?:expires|max\-age|path|domain|secure)$/i.test(key)) return false;
    const expires = end ? (typeof end === 'number' ? (end === Infinity ? '; expires=Fri, 31 Dec 9999 23:59:59 GMT' : '; max-age=' + end) : typeof end === 'string' ? '; expires=' + end : end instanceof Date ? '; expires=' + end.toUTCString() : '') : '';
    document.cookie = encodeURIComponent(key) + '=' + encodeURIComponent(value) + expires + (domain ? '; domain=' + domain : '') + (path ? '; path=' + path : '') + (secure ? '; secure' : '');
    return true;
}
