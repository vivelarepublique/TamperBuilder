import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadBannerConfig, loadFrameworkConfig } from '../../config/getParameters';

const temporaryDirectories: string[] = [];

function createFixture(): string {
    const rootDirectory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-config-'));
    temporaryDirectories.push(rootDirectory);
    mkdirSync(path.join(rootDirectory, 'config'), { recursive: true });
    mkdirSync(path.join(rootDirectory, 'src/vue/components'), { recursive: true });
    writeFileSync(
        path.join(rootDirectory, 'config/banner.yaml'),
        `name: fixture\nnamespace: https://example.com/\nversion: 1.0.0\ndescription: fixture\nauthor: fixture\nmatch:\n  - https://example.com/*\ngrant:\n  - GM_xmlhttpRequest\nconnect:\n  - api.example.com\n`,
    );
    writeFileSync(
        path.join(rootDirectory, 'config/global-configuration.yaml'),
        `- framework: vue\n  nickname: vue\n  componentsFilesPaths: src/vue/components\n`,
    );
    return rootDirectory;
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { force: true, recursive: true });
    }
});

describe('configuration loading', () => {
    it('loads both YAML files independently of the current working directory', () => {
        const rootDirectory = createFixture();
        const originalWorkingDirectory = process.cwd();
        const unrelatedDirectory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-cwd-'));
        temporaryDirectories.push(unrelatedDirectory);

        try {
            process.chdir(unrelatedDirectory);
            expect(loadBannerConfig({ rootDirectory, packageMetadata: {} })).toMatchObject({
                name: 'fixture',
                grant: ['GM_xmlhttpRequest'],
                connect: ['api.example.com'],
            });
            expect(loadFrameworkConfig({ rootDirectory })).toEqual([
                {
                    framework: 'vue',
                    nickname: 'vue',
                    componentsFilesPaths: 'src/vue/components',
                },
            ]);
        } finally {
            process.chdir(originalWorkingDirectory);
        }
    });

    it('rejects a missing match list instead of expanding the script scope', () => {
        const rootDirectory = createFixture();
        writeFileSync(path.join(rootDirectory, 'config/banner.yaml'), 'name: fixture\ngrant:\n  - GM_xmlhttpRequest\n');

        expect(() => loadBannerConfig({ rootDirectory, packageMetadata: {} })).toThrow('banner.match: is required');
    });

    it('rejects grants outside the approved list with a field path', () => {
        const rootDirectory = createFixture();
        writeFileSync(path.join(rootDirectory, 'config/banner.yaml'), 'name: fixture\nmatch:\n  - https://example.com/*\ngrant:\n  - window.onurlchange\n');

        expect(() => loadBannerConfig({ rootDirectory, packageMetadata: {} })).toThrow('banner.grant[0]');
    });

    it('rejects wildcard connect values with a field path', () => {
        const rootDirectory = createFixture();
        writeFileSync(path.join(rootDirectory, 'config/banner.yaml'), "name: fixture\nmatch:\n  - https://example.com/*\nconnect: '*'\n");

        expect(() => loadBannerConfig({ rootDirectory, packageMetadata: {} })).toThrow('banner.connect[0]');
    });

    it('rejects missing component directories with a field path', () => {
        const rootDirectory = createFixture();
        writeFileSync(
            path.join(rootDirectory, 'config/global-configuration.yaml'),
            '- framework: vue\n  nickname: vue\n  componentsFilesPaths: src/missing/components\n',
        );

        expect(() => loadFrameworkConfig({ rootDirectory })).toThrow('frameworks[0].componentsFilesPaths');
    });

    it('rejects duplicate or unsupported framework records', () => {
        const rootDirectory = createFixture();
        writeFileSync(
            path.join(rootDirectory, 'config/global-configuration.yaml'),
            '- framework: angular\n  nickname: angular\n  componentsFilesPaths: src/vue/components\n',
        );

        expect(() => loadFrameworkConfig({ rootDirectory })).toThrow('frameworks[0].framework');
    });
});
