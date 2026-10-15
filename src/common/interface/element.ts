type PathType = 'text/javascript' | 'module';

export interface ScriptOptions extends Pick<HTMLScriptElement, 'src' | 'type'> {
    type: PathType;
}

export type LinkOptions = Partial<Pick<HTMLLinkElement, 'rel' | 'href' | 'integrity' | 'crossOrigin'>>;

export interface IndexedByStringElement extends HTMLElement {
    [key: string]: unknown;
}

export interface ElementAttributeOptions<T extends keyof HTMLElementTagNameMap, D extends keyof HTMLElementDeprecatedTagNameMap> {
    props?: Partial<HTMLElementTagNameMap[T] | HTMLElementDeprecatedTagNameMap[D] | HTMLElement>;
    styles?: Partial<CSSStyleDeclaration>;
    event?: CustomEventListener<keyof HTMLElementEventMap> | CustomEventListener<keyof HTMLElementEventMap>[];
}

export type ElementType = HTMLElement;

export interface CustomEventListener<E extends keyof HTMLElementEventMap> {
    type: string | E;
    listener: ((this: HTMLElement, ev: HTMLElementEventMap[E]) => void) | EventListenerOrEventListenerObject;
    options?: boolean | AddEventListenerOptions;
}

export interface CommonSelectors extends Partial<Pick<HTMLElement, 'id' | 'className' | 'tagName'>> {
    tagName: string;
    other?: string;
}
