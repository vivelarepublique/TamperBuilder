import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { VersionConfig } from '../interfaces/index.ts';

const packageMetadataPath = fileURLToPath(new URL('../../../package.json', import.meta.url));

function loadPackageVersion(): string {
    let content: string;
    try {
        content = fs.readFileSync(packageMetadataPath, 'utf8');
    } catch (error) {
        throw new Error(`Unable to read package metadata from ${packageMetadataPath}`, { cause: error });
    }

    let metadata: unknown;
    try {
        metadata = JSON.parse(content);
    } catch (error) {
        throw new Error(`Unable to parse package metadata from ${packageMetadataPath}`, { cause: error });
    }

    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) || typeof (metadata as { version?: unknown }).version !== 'string') {
        throw new Error(`Package metadata at ${packageMetadataPath} must contain a string version`);
    }
    return (metadata as { version: string }).version;
}

const packageVersion = loadPackageVersion();

export function generateNewVersionId(config: VersionConfig): string {
    const date = new Date();
    const time = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    const { format, generateWay, manualControlWay } = config;
    if (format === 'yyyy-MM-dd') {
        return `${time.year}-${time.month}-${time.day}`;
    } else if (format === 'x.y.z') {
        if (!generateWay || generateWay === 'auto') {
            if (packageVersion === '0.0.0') {
                return readCacheFileVersionId();
            } else {
                return packageVersion;
            }
        } else if (generateWay === 'manual') {
            if (!manualControlWay || manualControlWay === 'date') {
                return `${time.year - 2021}.${time.month}.${time.day}`;
            } else {
                return readCacheFileVersionId();
            }
        } else {
            throw new Error('generateWay must be auto or manual');
        }
    } else {
        throw new Error('format must be yyyy-MM-dd or x.y.z');
    }
}

function readCacheFileVersionId() {
    const filename = 'cache/tamper-version-id.txt';
    if (!fs.existsSync('cache')) {
        fs.mkdirSync('cache');
    }
    if (fs.existsSync(filename)) {
        const content = (Number.parseInt(fs.readFileSync(filename, 'utf-8') || '1') + 1).toString().padStart(8, '0');
        fs.writeFileSync(filename, content, 'utf-8');
        return `${Number.parseInt(content.substring(0, 4))}.${Number.parseInt(content.substring(4, 6))}.${Number.parseInt(content.substring(6, 8))}`;
    } else {
        fs.writeFileSync(filename, '00000001', 'utf-8');
        return '0.0.1';
    }
}
