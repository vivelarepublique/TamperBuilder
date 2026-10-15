export interface ExternalCssPolicy {
    timeoutMs: number;
    maxResponseBytes: number;
    maxRedirects: number;
    allowedRedirectOrigins: string[];
}

export interface TreeShakingOptions {
    manualEntry?: string | string[];
    componentsFilesPath?: string | string[];
    excludeTags?: string[];
    excludeClassNameKeywords?: string;
    replaceVariableDeclarations?: boolean;
    externalCssPolicy?: ExternalCssPolicy;
    signal?: AbortSignal;
    cacheDirectory?: string;
}

export interface KeyAndValueObject {
    key: string;
    value: string;
}

export interface CssRuleObject {
    selector: string;
    content: string;
}

export interface CssRuleObjectArrayBasic {
    selectors: string[];
    contents: string[];
}

export interface CssRuleObjectArray {
    selectors: string[];
    contents: CssRuleObjectArrayBasic[] | string[];
}

export interface FiltrationCondition {
    tags: string[];
    classes: string[];
}

export interface HTMLStructure {
    html: {
        head: {
            meta: unknown[];
            title: string;
            link?: StylesheetLink | StylesheetLink[];
        };
        body: {
            scripts: { __type: string; __src: string } | { __type: string; __src: string }[];
        };
        __lang?: string;
    };
}

export interface StylesheetLink {
    __rel: string;
    __href: string;
    __integrity?: string;
    __crossorigin?: string;
}
