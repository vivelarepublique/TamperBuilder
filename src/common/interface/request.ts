export type RequestMethods = 'GET' | 'HEAD' | 'POST';

export interface RequestHeaders {
    readonly [header: string]: string;
}

export interface HttpRequestParameters {
    url: string;
    method: RequestMethods;
    headers?: RequestHeaders;
    data?: string;
    redirect?: 'follow' | 'error' | 'manual';
    cookie?: string;
    binary?: boolean;
    nocache?: boolean;
    revalidate?: boolean;
    timeout?: number;
    responseType?: 'arraybuffer' | 'blob' | 'json' | 'stream';
    overrideMimeType?: string;
    anonymous?: boolean;
    fetch?: boolean;
    user?: string;
    password?: string;
    signal?: AbortSignal;
}

export type TampermonkeyWebRequestParameters = HttpRequestParameters;

export type RequestFailureKind = 'http' | 'timeout' | 'abort' | 'network' | 'parse';

interface RequestResultMetadata {
    status: number;
    headers: RequestHeaders;
    finalUrl: string;
    contentType: string;
}

export interface RequestSuccess<T> extends RequestResultMetadata {
    ok: true;
    data: T;
}

export interface RequestFailure extends RequestResultMetadata {
    ok: false;
    failure: RequestFailureKind;
    message: string;
}

export type RequestResult<T = unknown> = RequestSuccess<T> | RequestFailure;
