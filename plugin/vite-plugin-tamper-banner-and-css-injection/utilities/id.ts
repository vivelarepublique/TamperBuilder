import pkg from '../../../package.json';
import fs from 'node:fs';
import type { VersionConfig } from '../interfaces';

export function generateNewVersionId(config: VersionConfig): string {
    const date = new Date();
    const time = { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
    const { format, generateWay, manualControlWay } = config;
    if (format === 'yyyy-MM-dd') {
        return `${time.year}-${time.month}-${time.day}`;
    } else if (format === 'x.y.z') {
        if (!generateWay || generateWay === 'auto') {
            if (pkg.version === '0.0.0') {
                return readCacheFileVersionId();
            } else {
                return pkg.version;
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
