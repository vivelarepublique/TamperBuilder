export interface ScriptInformationParameters {
    name: string;
    namespace: string;
    version: string;
    description: string;
    author: string;
    match: string[];
    runAt?: string;
    runIn?: string;
    sandbox?: string;
    tag?: string[];
    noframes?: boolean;
    grant?: string[];
    connect?: string | string[];
}

export interface VersionConfig {
    format: 'x.y.z' | 'yyyy-MM-dd';
    generateWay?: 'auto' | 'manual';
    manualControlWay?: 'file' | 'date';
}

export type SecureHashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

export interface PluginOption {
    bannerConfig: ScriptInformationParameters;
    beautifulCss?: boolean;
}
