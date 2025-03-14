import YAML from 'yaml';
import fs from 'node:fs';
import pkg from '../package.json';
import type { ScriptInformationParameters } from '../plugin/vite-plugin-tamper-banner-and-css-injection';

const bannerFile = fs.readFileSync('./config/banner.yaml', 'utf8');
const banner = YAML.parse(bannerFile);
const { name, namespace, version, description, author, match, require, runAt, runIn, sandbox, tag, noframes, grant, connect } = banner as ScriptInformationParameters;
export const bannerConfig: ScriptInformationParameters = {
    name: pkg.name || name || 'New-UserScript',
    namespace: namespace || 'https://www.tampermonkey.net/',
    version: (pkg.version && /[1-9]/.test(pkg.version) ? pkg.version : version) || '',
    description: pkg.description || description || 'try to take over the world!',
    author: pkg.author || author || 'You',
    match: match || ['*://*/*'],
    require,
    runAt: runAt || 'document-idle',
    runIn,
    sandbox,
    tag,
    noframes,
    grant,
    connect,
};

export interface GlobalConfig {
    framework: string;
    nickname: string;
    componentsFilesPaths: string;
    cdnURL: string;
    subLibraries?: {
        name: string;
        cdnURL: string;
    }[];
}

const configFile = fs.readFileSync('./config/global-configuration.yaml', 'utf8');
const config = YAML.parse(configFile);
export const globalConfig = config as GlobalConfig[];
