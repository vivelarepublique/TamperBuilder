declare namespace Tampermonkey {
    type ValueChangeListener = (name: string, oldValue: any, newValue: any, remote: boolean) => void;

    enum ReadyState {
        Unsent = 0,
        Opened = 1,
        HeadersReceived = 2,
        Loading = 3,
        Done = 4,
    }

    interface ResponseBase {
        readonly responseHeaders: string;
        readonly readyState: ReadyState;
        readonly response: any;
        readonly responseText: string;
        readonly responseXML: Document | null;
        readonly status: number;
        readonly statusText: string;
    }

    interface ProgressResponseBase {
        done: number;
        lengthComputable: boolean;
        loaded: number;
        position: number;
        total: number;
        totalSize: number;
    }

    interface ErrorResponse extends ResponseBase {
        readonly error: string;
    }

    interface Response<TContext> extends ResponseBase {
        readonly finalUrl: string;
        readonly context: TContext;
    }

    interface ProgressResponse<TContext> extends Response<TContext>, ProgressResponseBase {}

    interface RequestHeaders {
        readonly [header: string]: string;
    }

    type RequestEventListener<TResponse> = (this: TResponse, response: TResponse) => void;

    interface Request<TContext = object> {
        method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE';
        url: string | URL;
        headers?: RequestHeaders;
        data?: string | Blob | File | object | any[] | FormData | URLSearchParams;
        redirect?: 'follow' | 'error' | 'manual';
        cookie?: string;
        cookiePartition?: {
            topLevelSite?: string;
        };
        binary?: boolean;
        nocache?: boolean;
        revalidate?: boolean;
        timeout?: number;
        context?: TContext;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'stream';
        overrideMimeType?: string;
        anonymous?: boolean;
        fetch?: boolean;
        user?: string;
        password?: string;

        onabort?(): void;
        onerror?: RequestEventListener<ErrorResponse>;
        onloadstart?: RequestEventListener<Response<TContext>>;
        onprogress?: RequestEventListener<ProgressResponse<TContext>>;
        onreadystatechange?: RequestEventListener<Response<TContext>>;
        ontimeout?(): void;
        onload?: RequestEventListener<Response<TContext>>;
    }

    interface DownloadProgressResponse extends ProgressResponseBase {
        readonly finalUrl: string;
    }

    interface DownloadErrorResponse {
        error: 'not_enabled' | 'not_whitelisted' | 'not_permitted' | 'not_supported' | 'not_succeeded';
        details?: string;
    }

    interface DownloadRequest {
        url: string;
        name: string;
        headers?: RequestHeaders;
        saveAs?: boolean;
        timeout?: number;
        conflictAction?: 'uniquify' | 'overwrite' | 'prompt';
        onerror?: RequestEventListener<DownloadErrorResponse>;
        ontimeout?(): void;
        onload?(): void;
        onprogress?: RequestEventListener<DownloadProgressResponse>;
    }

    interface AbortHandle<TReturn> {
        abort(): TReturn;
    }

    interface OpenTabOptions {
        active?: boolean;
        insert?: number | boolean;
        setParent?: boolean;
        incognito?: boolean;
    }

    interface OpenTabObject {
        close(): void;
        onclose?(): void;
        closed: boolean;
    }

    interface NotificationThis extends Notification {
        id: string;
    }

    type NotificationOnClick = (this: NotificationThis) => void;
    type NotificationOnDone = (this: NotificationThis, clicked: boolean) => void;

    interface Notification {
        text?: string;
        title?: string;
        tag?: string;
        image?: string;
        highlight?: boolean;
        silent?: boolean;
        timeout?: number;
        url?: string;
        onclick?: NotificationOnClick;
        ondone?: NotificationOnDone;
    }

    interface TextNotification extends Notification {
        text: string;
    }

    interface HighlightNotification extends Notification {
        text?: undefined;
        highlight: true;
    }

    type NotificationDetails = TextNotification | HighlightNotification;

    interface ScriptMetadataOverrides {
        merge_connects: boolean;
        merge_excludes: boolean;
        merge_includes: boolean;
        merge_matches: boolean;
        orig_connects: string[];
        orig_excludes: string[];
        orig_includes: string[];
        orig_matches: string[];
        orig_noframes: string | null;
        orig_run_at: string | null;
        use_blockers: string[];
        use_connects: string[];
        use_excludes: string[];
        use_includes: string[];
        use_matches: string[];
    }

    interface ScriptSettings {
        check_for_updates: boolean;
        comment: string | null;
        compat_foreach: boolean;
        compat_metadata: boolean;
        compat_powerful_this: boolean | null;
        compat_prototypes: boolean;
        compat_wrappedjsobject: boolean;
        compatopts_for_requires: boolean;
        noframes: boolean | null;
        run_at: string;
        sandbox: string | null;
        tab_types: string | null;
        unwrap: boolean | null;

        override: ScriptMetadataOverrides;
    }

    interface ScriptResource {
        name: string;
        url?: string;
        content?: string;
        meta?: string;
        error?: string;
    }

    interface WebRequestRule {
        selector:
            | {
                  include?: string | string[];
                  match?: string | string[];
                  exclude?: string | string[];
              }
            | string;
        action:
            | string
            | {
                  cancel?: boolean;
                  redirect?:
                      | {
                            url: string;
                            from?: string;
                            to?: string;
                        }
                      | string;
              };
    }

    interface ScriptMetadata {
        antifeatures: Record<string, Record<string, string>>;
        author: string | null;

        blockers: string[];

        copyright: string | null;
        deleted?: number;
        description: string | null;
        description_i18n: Record<string, string> | null;
        downloadURL: string | null;
        enabled?: boolean;
        evilness: number;
        excludes: string[];
        fileURL?: string | null;
        grant: string[];
        header: string;
        homepage: string | null;
        icon: string | null;
        icon64: string | null;
        includes: string[];
        lastModified: number;
        matches: string[];
        name: string;
        name_i18n: Record<string, string> | null;
        namespace: string | null;
        options: ScriptSettings;

        position: number;
        resources: ScriptResource[];

        'run-at': string;

        supportURL: string | null;
        sync?: {
            imported?: number;
        };
        system?: boolean;
        unwrap: boolean;
        updateURL: string | null;
        uuid: string;
        version: string;
        webRequest: WebRequestRule[] | null;
    }

    interface ScriptInfo {
        downloadMode: 'native' | 'browser' | 'disabled';
        isFirstPartyIsolation?: boolean;
        isIncognito: boolean;
        script: ScriptMetadata;
        sandboxMode: 'js' | 'raw' | 'dom';

        scriptHandler: string;

        scriptMetaStr: string | null;
        scriptSource: string;
        scriptUpdateURL: string | null;
        scriptWillUpdate: boolean;

        version?: string;
    }

    type ContentType = string | { type?: string; mimetype?: string };

    interface WebRequestRuleParam {
        selector:
            | string
            | {
                  include?: string | string[];
                  match?: string | string[];
                  exclude?: string | string[];
              };
        action:
            | 'cancel'
            | {
                  cancel?: boolean;
                  redirect?:
                      | string
                      | {
                            from: string;
                            to: string;
                        };
              };
    }

    type WebRequestListener = (
        info: 'cancel' | 'redirect',
        message: 'ok' | 'error',
        details: {
            rule: WebRequestRuleParam;
            url?: string;
            redirect_url?: string;
            description?: string;
        },
    ) => void;

    interface Cookie {
        domain: string;
        firstPartyDomain?: string;
        partitionKey?: {
            topLevelSite?: string;
        };
        hostOnly: boolean;
        httpOnly: boolean;
        name: string;
        path: string;
        sameSite: string;
        secure: boolean;
        session: boolean;
        value: string;
        expirationDate?: number;
    }

    interface ListCookiesDetails {
        url?: string;
        domain?: string;
        name?: string;
        path?: string;
        partitionKey?: {
            topLevelSite?: string;
        };
    }

    type ListCookiesCallback = (cookies: Cookie[], error: string | null) => void;

    interface SetCookiesDetails {
        url?: string;
        name: string;
        value: string;
        domain?: string;
        firstPartyDomain?: string;
        partitionKey?: {
            topLevelSite?: string;
        };
        path?: string;
        secure?: boolean;
        httpOnly?: boolean;
        expirationDate?: number;
    }

    interface DeleteCookiesDetails {
        url: string;
        name: string;
        firstPartyDomain: string;
        partitionKey: {
            topLevelSite?: string;
        };
    }
}

declare var unsafeWindow: Window &
    Omit<
        typeof globalThis,
        | 'GM_addElement'
        | 'GM_addStyle'
        | 'GM_addValueChangeListener'
        | 'GM_deleteValue'
        | 'GM_download'
        | 'GM_getResourceText'
        | 'GM_getResourceURL'
        | 'GM_getTab'
        | 'GM_getTabs'
        | 'GM_getValue'
        | 'GM_info'
        | 'GM_listValues'
        | 'GM_log'
        | 'GM_notification'
        | 'GM_openInTab'
        | 'GM_registerMenuCommand'
        | 'GM_removeValueChangeListener'
        | 'GM_saveTab'
        | 'GM_setClipboard'
        | 'GM_setValue'
        | 'GM_unregisterMenuCommand'
        | 'GM_xmlhttpRequest'
        | 'GM'
    >;

interface Window {
    onurlchange: null;
    addEventListener(type: 'urlchange', listener: (urlObject: { url: string }) => void): void;
}

declare function GM_addElement(tagName: string, attributes: object): HTMLElement;

declare function GM_addElement(parentNode: Element, tagName: string, attributes: object): HTMLElement;

declare function GM_addStyle(css: string): HTMLStyleElement;

declare function GM_setValue(name: string, value: any): void;

declare function GM_addValueChangeListener(name: string, listener: Tampermonkey.ValueChangeListener): number;

declare function GM_removeValueChangeListener(listenerId: number): void;

declare function GM_getValue<TValue>(name: string, defaultValue?: TValue): TValue;

declare function GM_deleteValue(name: string): void;

declare function GM_listValues(): string[];

declare function GM_getResourceText(name: string): string;

declare function GM_getResourceURL(name: string): string;

declare function GM_registerMenuCommand(
    name: string,
    onClick: (event: MouseEvent | KeyboardEvent) => void,
    optionsOrAccessKey?:
        | string
        | {
              id?: number | string;
              accessKey?: string;
              autoClose?: boolean;
              title?: string;
          },
): number;

declare function GM_unregisterMenuCommand(menuCommandId: number): void;

declare function GM_xmlhttpRequest<TContext = any>(details: Tampermonkey.Request<TContext>): Tampermonkey.AbortHandle<void>;

declare function GM_download(details: Tampermonkey.DownloadRequest): Tampermonkey.AbortHandle<boolean>;
declare function GM_download(url: string, name: string): Tampermonkey.AbortHandle<boolean>;

declare function GM_saveTab(tab: object, callback?: () => void): void;

declare function GM_getTab(callback: (obj: any) => void): void;

declare function GM_getTabs(callback: (tabsMap: { [tabId: number]: any }) => void): void;

declare var GM_info: Tampermonkey.ScriptInfo;

declare function GM_log(...message: any[]): void;

declare function GM_openInTab(url: string, options?: Tampermonkey.OpenTabOptions | boolean): Tampermonkey.OpenTabObject;

declare function GM_notification(details: Tampermonkey.NotificationDetails, ondone?: Tampermonkey.NotificationOnDone): void;

declare function GM_notification(text: string, title?: string, image?: string, onClick?: Tampermonkey.NotificationOnClick): void;

declare function GM_setClipboard(data: string, info?: Tampermonkey.ContentType, callback?: () => void): void;

declare function GM_webRequest(rules: Tampermonkey.WebRequestRuleParam[], listener?: Tampermonkey.WebRequestListener): Tampermonkey.AbortHandle<void>;

type AtLeastOneOf<T> = { [K in keyof T]: Pick<T, K> }[keyof T];

declare var GM_cookie: {
    list(details?: Tampermonkey.ListCookiesDetails, callback?: Tampermonkey.ListCookiesCallback): void;

    set(details: Tampermonkey.SetCookiesDetails, callback?: (error?: string) => void): void;

    delete(details: AtLeastOneOf<Tampermonkey.DeleteCookiesDetails>, callback?: (error?: string) => void): void;
};

declare var GM: Readonly<{
    addStyle(css: string): Promise<HTMLStyleElement>;

    setValue(name: string, value: any): Promise<void>;

    getValue<TValue>(name: string, defaultValue?: TValue): Promise<TValue>;

    deleteValue(name: string): Promise<void>;

    listValues(): Promise<string[]>;

    addValueChangeListener(name: string, listener: Tampermonkey.ValueChangeListener): Promise<number>;

    removeValueChangeListener(listenerId: number): Promise<void>;

    getResourceText(name: string): Promise<string>;

    getResourceUrl(name: string): Promise<string>;

    registerMenuCommand(name: string, onClick: () => void, accessKey?: string): Promise<number>;
    unregisterMenuCommand(menuCommandId: number): Promise<void>;

    xmlHttpRequest<TContext = any>(details: Tampermonkey.Request<TContext>): Promise<Tampermonkey.Response<TContext>>;

    download(details: Tampermonkey.DownloadRequest): Promise<void>;

    saveTab(obj: any): Promise<void>;

    getTab(): Promise<any>;

    getTabs(): Promise<{ [tabId: number]: any }>;

    info: Tampermonkey.ScriptInfo;

    log(...message: any[]): Promise<void>;

    openInTab(url: string, options?: Tampermonkey.OpenTabOptions | boolean): Promise<Tampermonkey.OpenTabObject>;

    notification(details: Tampermonkey.NotificationDetails, ondone?: Tampermonkey.NotificationOnDone): Promise<boolean>;

    notification(text: string, title?: string, image?: string, onclick?: Tampermonkey.NotificationOnClick): Promise<boolean>;

    setClipboard(data: string, info?: Tampermonkey.ContentType): Promise<void>;
}>;
