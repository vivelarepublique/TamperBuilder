import { appendElement, createElementWithAttributes, getElement } from './elementBasic';
import type { ScriptOptions, LinkOptions } from '../interface/element';
import { body, head } from '../alias';

export function createDivAppElement(id: string | string[]): void {
    if (Array.isArray(id)) id.forEach(i => appendElement(body, createElementWithAttributes('div', { props: { id: `${i}App` } })));
    else appendElement(body, createElementWithAttributes('div', { props: { id: `${id}App` } }));
}

export function createAppElement(name: string | string[]): void {
    if (Array.isArray(name)) name.forEach(n => appendElement(body, createElementWithAttributes(`${n}-app`)));
    else appendElement(body, createElementWithAttributes(`${name}-app`));
}

export function createScriptElement(options: ScriptOptions | ScriptOptions[]): void {
    if (Array.isArray(options)) options.forEach(o => appendElement(head, createElementWithAttributes('script', { props: o })));
    else appendElement(head, createElementWithAttributes('script', { props: options }));
}

export function createLinkElement(options: LinkOptions | LinkOptions[]): void {
    if (Array.isArray(options)) options.forEach(o => appendElement(head, createElementWithAttributes('link', { props: o })));
    else appendElement(head, createElementWithAttributes('link', { props: options }));
}

export function getMultiDivAppElement(id: string[]): HTMLElement[] {
    return id.map(i => getElement(`div#${i}App`)!);
}
