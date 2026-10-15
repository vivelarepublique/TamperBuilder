import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CACHE_DIRECTORY = 'cache';

export function normalizeRemoteUrl(href: string): string {
    const url = new URL(href);
    url.hash = '';
    return url.href;
}

export function pickupCacheName(href: string): string {
    return `${createHash('sha256').update(normalizeRemoteUrl(href)).digest('hex')}.css`;
}

export function getVerifiedCache(
    name: string,
    expectedDigest: Buffer,
    cacheDirectory = DEFAULT_CACHE_DIRECTORY,
    maxResponseBytes = Number.MAX_SAFE_INTEGER,
    signal?: AbortSignal,
): Buffer | undefined {
    const cachePath = path.join(cacheDirectory, name);
    if (signal?.aborted) throw new Error(`CSS cache read was cancelled: ${cachePath}`);
    if (!fs.existsSync(cachePath)) return undefined;

    let content: Buffer;
    try {
        if (fs.statSync(cachePath).size > maxResponseBytes) {
            fs.unlinkSync(cachePath);
            return undefined;
        }
        content = fs.readFileSync(cachePath);
    } catch (error) {
        throw new Error(`Unable to read CSS cache entry ${cachePath}`, { cause: error });
    }
    if (signal?.aborted) throw new Error(`CSS cache read was cancelled: ${cachePath}`);

    const actualDigest = createHash('sha256').update(content).digest();
    if (actualDigest.equals(expectedDigest)) return content;

    try {
        fs.unlinkSync(cachePath);
    } catch (error) {
        throw new Error(`Unable to discard corrupt CSS cache entry ${cachePath}`, { cause: error });
    }
    return undefined;
}

export function createCache(name: string, content: Buffer, cacheDirectory = DEFAULT_CACHE_DIRECTORY, signal?: AbortSignal): void {
    const cachePath = path.join(cacheDirectory, name);
    const temporaryPath = path.join(cacheDirectory, `.${name}.${process.pid}.${randomUUID()}.tmp`);
    let descriptor: number | undefined;

    try {
        if (signal?.aborted) throw new Error('cache write cancelled');
        fs.mkdirSync(cacheDirectory, { recursive: true });
        descriptor = fs.openSync(temporaryPath, 'wx', 0o600);
        fs.writeFileSync(descriptor, content);
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = undefined;
        if (signal?.aborted) throw new Error('cache write cancelled');
        fs.renameSync(temporaryPath, cachePath);
    } catch (error) {
        if (descriptor !== undefined) {
            try {
                fs.closeSync(descriptor);
            } catch {
                // Preserve the original cache write failure.
            }
        }
        try {
            fs.rmSync(temporaryPath, { force: true });
        } catch {
            // Preserve the original cache write failure.
        }
        throw new Error(`Unable to atomically write CSS cache entry ${cachePath}`, { cause: error });
    }
}
