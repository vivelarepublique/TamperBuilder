import { defineConfig } from 'vite';
import type { PluginOption } from 'vite';

import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

import preact from '@preact/preset-vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import solid from 'vite-plugin-solid';

import linkCssTreeShaking from './plugin/vite-plugin-link-css-tree-shaking';
import tamperBannerAndCssInjection from './plugin/vite-plugin-tamper-banner-and-css-injection';

import { visualizer } from 'rollup-plugin-visualizer';

import { bannerConfig, supportedFramework } from './config/getParameters';

export default defineConfig(({ command, mode }) => {
    const isBuild = command === 'build';
    const isPrimitive = mode === 'primitive';
    const minify = mode === 'minify';
    const analyze = mode === 'analyze';

    const buildPlugins: PluginOption[] = isBuild
        ? [
              linkCssTreeShaking({
                  //   manualEntry: 'path/to/your/custom.css',
                  componentsFilesPath: supportedFramework.map(framework => `src/${framework}/components`),
                  replaceVariableDeclarations: true,
              }),
              tamperBannerAndCssInjection({
                  beautifulCss: true,
                  bannerConfig,
              }),
          ].concat(
              analyze
                  ? [
                        visualizer({
                            emitFile: true,
                            filename: 'stats.html',
                        }),
                    ]
                  : [],
          )
        : [];

    return {
        css: {
            preprocessorOptions: {
                less: { math: 'parens-division' },
                sass: { api: 'modern' },
            },
        },
        server: {
            port: 5267,
            proxy: {
                '/picture': {
                    target: 'http://www.bing.com',
                    changeOrigin: true,
                    secure: true,
                    rewrite: path => path.replace(/^\/picture/, ''),
                },
            },
        },
        build: {
            target: 'esnext',
            outDir: 'release',
            assetsInlineLimit: 16384,
            chunkSizeWarningLimit: 2048,
            minify: 'terser',
            terserOptions: {
                compress: !isPrimitive,
                mangle: !isPrimitive,
                format: { beautify: !minify },
            },
            rollupOptions: {
                input: './src/index.ts',
                output: { entryFileNames: `${bannerConfig.name}.user.js` },
            },
        },
        plugins: [
            vue(),
            react({
                include: ['src/react/**/*.{tsx,ts,jsx,js}'],
            }),
            preact({
                include: ['src/preact/**/*.{tsx,ts,jsx,js}'],
            }),
            svelte({
                preprocess: vitePreprocess(),
            }),
            solid({
                include: ['src/solid/**/*.{tsx,ts,jsx,js}'],
            }),
            ...buildPlugins,
        ],
    };
});
