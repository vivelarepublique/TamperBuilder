import path from 'node:path';
import type { ConfigEnv, PluginOption, UserConfig } from 'vite';

import linkCssTreeShaking from './plugin/vite-plugin-link-css-tree-shaking';
import tamperBannerAndCssInjection from './plugin/vite-plugin-tamper-banner-and-css-injection';
import frameworkEntry, { FRAMEWORK_ENTRY_ID } from './plugin/vite-plugin-framework-entry';
import { getProjectRoot, loadBannerConfig, loadFrameworkConfig } from './config/getParameters';
import type { FrameworkConfiguration } from './config/getParameters';

async function loadSelectedFrameworkPlugins(frameworks: FrameworkConfiguration[]): Promise<PluginOption[]> {
    const plugins: PluginOption[] = [];
    for (const { framework } of frameworks) {
        switch (framework) {
            case 'vue': {
                const { default: vue } = await import('@vitejs/plugin-vue');
                plugins.push(vue());
                break;
            }
            case 'react': {
                const { default: react } = await import('@vitejs/plugin-react');
                plugins.push(react({ include: ['src/react/**/*.{tsx,ts,jsx,js}'] }));
                break;
            }
            case 'preact': {
                const { default: preact } = await import('@preact/preset-vite');
                plugins.push(preact({ include: ['src/preact/**/*.{tsx,ts,jsx,js}'] }));
                break;
            }
            case 'svelte': {
                const { svelte, vitePreprocess } = await import('@sveltejs/vite-plugin-svelte');
                plugins.push(svelte({ preprocess: vitePreprocess() }));
                break;
            }
            case 'solid-js': {
                const { default: solid } = await import('vite-plugin-solid');
                plugins.push(solid({ include: ['src/solid/**/*.{tsx,ts,jsx,js}'] }));
                break;
            }
            case 'lit':
                break;
        }
    }
    return plugins;
}

export default async function configure({ command, mode }: ConfigEnv): Promise<UserConfig> {
    const rootDirectory = getProjectRoot();
    const bannerConfig = loadBannerConfig({ rootDirectory });
    const globalConfig = loadFrameworkConfig({
        rootDirectory,
        frameworkPath: process.env.TAMPER_BUILDER_FRAMEWORK_CONFIG,
    });
    const isBuild = command === 'build';
    const primitive = mode === 'primitive';
    const minify = mode === 'minify';
    const selectedFrameworkPlugins = await loadSelectedFrameworkPlugins(globalConfig);

    const buildPlugins: PluginOption[] = isBuild
        ? [
              linkCssTreeShaking({
                  componentsFilesPath: globalConfig.map(config => path.resolve(rootDirectory, config.componentsFilesPaths)),
                  replaceVariableDeclarations: true,
              }),
              tamperBannerAndCssInjection({
                  beautifulCss: true,
                  bannerConfig,
              }),
          ]
        : [];

    return {
        root: rootDirectory,
        server: {
            host: '127.0.0.1',
            port: 5267,
            open: true,
            proxy: {},
        },
        build: {
            target: 'esnext',
            outDir: 'release',
            assetsInlineLimit: 16384,
            chunkSizeWarningLimit: 2048,
            minify: 'terser',
            terserOptions: {
                compress: !primitive,
                mangle: !primitive,
                format: { beautify: !minify },
            },
            rolldownOptions: {
                input: FRAMEWORK_ENTRY_ID,
                output: { entryFileNames: `${bannerConfig.name}.user.js` },
            },
        },
        plugins: [
            frameworkEntry({
                frameworks: globalConfig,
                moduleGraphReportPath: process.env.TAMPER_BUILDER_MODULE_REPORT,
            }),
            ...selectedFrameworkPlugins,
            ...buildPlugins,
        ],
    };
}
