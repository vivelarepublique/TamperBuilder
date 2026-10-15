import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const eslint = new ESLint({ cwd: projectRoot });

const lintedPaths = [
    'src/react/App.tsx',
    'src/preact/App.tsx',
    'src/vue/App.vue',
    'src/svelte/App.svelte',
    'src/lit/index.ts',
    'src/solid/index.tsx',
    'plugin/vite-plugin-link-css-tree-shaking/index.ts',
    'config/getParameters.ts',
    'tests/config/get-parameters.test.ts',
    'scripts/verify-builds.mjs',
    'vite.config.ts',
    'vitest.config.ts',
    'eslint.config.js',
];

const ignoredPaths = [
    'node_modules/example/index.js',
    'release/tamper-builder.user.js',
    'cache/remote.css',
    'dist/index.js',
    'bundle/index.js',
    '.agents/tasks/context.json',
    'temp/generated.ts',
    'build/generated.js',
    'fixture.tsbuildinfo',
    'tests/plugin/__snapshots__/generated.snap',
];

describe('ESLint repository coverage', () => {
    it.each(lintedPaths)('lints %s', async filePath => {
        const absolutePath = path.join(projectRoot, filePath);
        await expect(eslint.isPathIgnored(absolutePath)).resolves.toBe(false);
        await expect(eslint.calculateConfigForFile(absolutePath)).resolves.toBeDefined();
    });

    it.each(ignoredPaths)('ignores %s', async filePath => {
        await expect(eslint.isPathIgnored(path.join(projectRoot, filePath))).resolves.toBe(true);
    });
});
