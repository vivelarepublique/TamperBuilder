export interface ScriptInformationParameters {
    name: string;
    namespace: string;
    version: string;
    description: string;
    author: string;
    match: string[];
    require?: string | string[];
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

import type { GlobalConfig } from '../../../config/getParameters';
export type { GlobalConfig };
export interface PluginOption {
    bannerConfig: ScriptInformationParameters;
    beautifulCss?: boolean;
    globalImport?: ImportByCDN;
}

interface ImportByCDN {
    importByCDN: boolean;
    importConfig: GlobalConfig[];
}
