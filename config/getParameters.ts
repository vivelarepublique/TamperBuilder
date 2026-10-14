import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import type { ScriptInformationParameters } from '../plugin/vite-plugin-tamper-banner-and-css-injection';

export const APPROVED_GRANTS = ['GM_xmlhttpRequest', 'unsafeWindow'] as const;
export const SUPPORTED_FRAMEWORKS = ['vue', 'react', 'preact', 'lit', 'svelte', 'solid-js'] as const;

export type SupportedFramework = (typeof SUPPORTED_FRAMEWORKS)[number];

export interface FrameworkConfiguration {
    framework: SupportedFramework;
    nickname: string;
    componentsFilesPaths: string;
}

interface PackageMetadata {
    name?: string;
    version?: string;
    description?: string;
    author?: string;
}

interface ConfigurationOptions {
    rootDirectory?: string;
    bannerPath?: string;
    frameworkPath?: string;
    packageMetadata?: PackageMetadata;
}

const defaultRootDirectory = fileURLToPath(new URL('..', import.meta.url));
const bannerFields = ['name', 'namespace', 'version', 'description', 'author', 'match', 'require', 'runAt', 'runIn', 'sandbox', 'tag', 'noframes', 'grant', 'connect'] as const;
const frameworkFields = ['framework', 'nickname', 'componentsFilesPaths'] as const;

function configurationError(field: string, message: string): never {
    throw new Error(`${field}: ${message}`);
}

function resolveConfigurationPath(rootDirectory: string, configuredPath: string | undefined, fallback: string): string {
    return path.resolve(rootDirectory, configuredPath ?? fallback);
}

function readYaml(filePath: string, field: string): unknown {
    try {
        return YAML.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        throw new Error(`${field}: unable to read valid YAML from ${filePath}`, { cause: error });
    }
}

function readPackageMetadata(rootDirectory: string): PackageMetadata {
    try {
        return JSON.parse(fs.readFileSync(path.join(rootDirectory, 'package.json'), 'utf8')) as PackageMetadata;
    } catch (error) {
        throw new Error(`package.json: unable to read project metadata`, { cause: error });
    }
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        configurationError(field, 'must be an object');
    }
    return value as Record<string, unknown>;
}

function rejectUnknownFields(record: Record<string, unknown>, allowedFields: readonly string[], field: string): void {
    for (const key of Object.keys(record)) {
        if (!allowedFields.includes(key)) {
            configurationError(`${field}.${key}`, 'is not supported');
        }
    }
}

function optionalString(record: Record<string, unknown>, key: string, field: string): string | undefined {
    const value = record[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || value.trim().length === 0) {
        configurationError(`${field}.${key}`, 'must be a non-empty string');
    }
    return value;
}

function stringList(record: Record<string, unknown>, key: string, field: string, required = false): string[] | undefined {
    const value = record[key];
    if (value === undefined) {
        if (required) configurationError(`${field}.${key}`, 'is required');
        return undefined;
    }
    if (!Array.isArray(value) || value.length === 0) {
        configurationError(`${field}.${key}`, 'must be a non-empty array');
    }
    const values = value.map((item, index) => {
        if (typeof item !== 'string' || item.trim().length === 0) {
            configurationError(`${field}.${key}[${index}]`, 'must be a non-empty string');
        }
        return item as string;
    });
    if (new Set(values).size !== values.length) {
        configurationError(`${field}.${key}`, 'must not contain duplicates');
    }
    return values;
}

function stringOrStringList(record: Record<string, unknown>, key: string, field: string): string | string[] | undefined {
    const value = record[key];
    if (value === undefined) return undefined;
    if (typeof value === 'string') {
        if (value.trim().length === 0) configurationError(`${field}.${key}`, 'must be a non-empty string');
        return value;
    }
    return stringList(record, key, field);
}

function validateConnectHost(host: string, field: string): void {
    const hostnamePattern = /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    if (!hostnamePattern.test(host)) {
        configurationError(field, 'must be an explicit hostname without a scheme, path, port, or wildcard');
    }
}

export function loadBannerConfig(options: ConfigurationOptions = {}): ScriptInformationParameters {
    const rootDirectory = options.rootDirectory ?? defaultRootDirectory;
    const bannerPath = resolveConfigurationPath(rootDirectory, options.bannerPath, 'config/banner.yaml');
    const banner = requireRecord(readYaml(bannerPath, 'banner'), 'banner');
    rejectUnknownFields(banner, bannerFields, 'banner');

    const metadata = options.packageMetadata ?? readPackageMetadata(rootDirectory);
    const match = stringList(banner, 'match', 'banner', true)!;
    const require = stringOrStringList(banner, 'require', 'banner');
    const tag = stringList(banner, 'tag', 'banner');
    const grants = stringList(banner, 'grant', 'banner') ?? [];
    const connectValue = stringOrStringList(banner, 'connect', 'banner');
    const connects = connectValue === undefined ? [] : Array.isArray(connectValue) ? connectValue : [connectValue];

    for (const [index, grant] of grants.entries()) {
        if (!(APPROVED_GRANTS as readonly string[]).includes(grant)) {
            configurationError(`banner.grant[${index}]`, `must be one of ${APPROVED_GRANTS.join(', ')}`);
        }
    }
    for (const [index, host] of connects.entries()) {
        validateConnectHost(host, `banner.connect[${index}]`);
    }

    const noframes = banner.noframes;
    if (noframes !== undefined && typeof noframes !== 'boolean') {
        configurationError('banner.noframes', 'must be a boolean');
    }
    const name = optionalString(banner, 'name', 'banner');
    const namespace = optionalString(banner, 'namespace', 'banner');
    const version = optionalString(banner, 'version', 'banner');
    const description = optionalString(banner, 'description', 'banner');
    const author = optionalString(banner, 'author', 'banner');
    const runAt = optionalString(banner, 'runAt', 'banner');
    const runIn = optionalString(banner, 'runIn', 'banner');
    const sandbox = optionalString(banner, 'sandbox', 'banner');

    return {
        name: metadata.name || name || 'New-UserScript',
        namespace: namespace || 'https://www.tampermonkey.net/',
        version: metadata.version || version || '',
        description: metadata.description || description || 'try to take over the world!',
        author: metadata.author || author || 'You',
        match,
        require,
        runAt: runAt || 'document-idle',
        runIn,
        sandbox,
        tag,
        noframes: noframes as boolean | undefined,
        grant: grants,
        connect: connects,
    };
}

export function loadFrameworkConfig(options: ConfigurationOptions = {}): FrameworkConfiguration[] {
    const rootDirectory = options.rootDirectory ?? defaultRootDirectory;
    const frameworkPath = resolveConfigurationPath(rootDirectory, options.frameworkPath, 'config/global-configuration.yaml');
    const rawConfiguration = readYaml(frameworkPath, 'frameworks');
    if (!Array.isArray(rawConfiguration) || rawConfiguration.length === 0) {
        configurationError('frameworks', 'must contain one or more framework records');
    }

    const seenFrameworks = new Set<string>();
    const seenNicknames = new Set<string>();
    return rawConfiguration.map((value, index) => {
        const field = `frameworks[${index}]`;
        const record = requireRecord(value, field);
        rejectUnknownFields(record, frameworkFields, field);
        const framework = optionalString(record, 'framework', field);
        const nickname = optionalString(record, 'nickname', field);
        const componentsFilesPaths = optionalString(record, 'componentsFilesPaths', field);

        if (!framework) configurationError(`${field}.framework`, 'is required');
        if (!(SUPPORTED_FRAMEWORKS as readonly string[]).includes(framework)) {
            configurationError(`${field}.framework`, `must be one of ${SUPPORTED_FRAMEWORKS.join(', ')}`);
        }
        if (seenFrameworks.has(framework)) configurationError(`${field}.framework`, 'must be unique');
        seenFrameworks.add(framework);

        if (!nickname) configurationError(`${field}.nickname`, 'is required');
        if (!/^[a-z][a-z0-9-]*$/.test(nickname)) {
            configurationError(`${field}.nickname`, 'must start with a letter and contain only lowercase letters, numbers, or hyphens');
        }
        if (seenNicknames.has(nickname)) configurationError(`${field}.nickname`, 'must be unique');
        seenNicknames.add(nickname);

        if (!componentsFilesPaths) configurationError(`${field}.componentsFilesPaths`, 'is required');
        if (path.isAbsolute(componentsFilesPaths)) {
            configurationError(`${field}.componentsFilesPaths`, 'must be relative to the project root');
        }
        const componentsPath = path.resolve(rootDirectory, componentsFilesPaths);
        const relativeComponentsPath = path.relative(rootDirectory, componentsPath);
        if (relativeComponentsPath.startsWith('..') || path.isAbsolute(relativeComponentsPath)) {
            configurationError(`${field}.componentsFilesPaths`, 'must stay within the project root');
        }
        if (!fs.existsSync(componentsPath) || !fs.statSync(componentsPath).isDirectory()) {
            configurationError(`${field}.componentsFilesPaths`, `directory does not exist: ${componentsFilesPaths}`);
        }

        return {
            framework: framework as SupportedFramework,
            nickname,
            componentsFilesPaths,
        };
    });
}

export function getProjectRoot(): string {
    return defaultRootDirectory;
}
