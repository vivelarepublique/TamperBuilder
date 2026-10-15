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

const frameworkRules = [
    ['src/vue/App.vue', 'vue/attribute-hyphenation'],
    ['src/svelte/App.svelte', 'svelte/no-at-html-tags'],
    ['src/react/App.tsx', 'react/jsx-key'],
    ['src/preact/App.tsx', 'react/no-unknown-property'],
    ['src/lit/index.ts', 'lit/no-invalid-html'],
    ['src/solid/index.tsx', 'solid/no-react-deps'],
] as const;

describe('ESLint repository coverage', () => {
    it.each(lintedPaths)('lints %s', async filePath => {
        const absolutePath = path.join(projectRoot, filePath);
        await expect(eslint.isPathIgnored(absolutePath)).resolves.toBe(false);
        await expect(eslint.calculateConfigForFile(absolutePath)).resolves.toBeDefined();
    });

    it.each(ignoredPaths)('ignores %s', async filePath => {
        await expect(eslint.isPathIgnored(path.join(projectRoot, filePath))).resolves.toBe(true);
    });

    it.each(frameworkRules)('enables %s rule %s', async (filePath, ruleName) => {
        const config = (await eslint.calculateConfigForFile(path.join(projectRoot, filePath))) as { rules?: Record<string, [number, ...unknown[]]> } | undefined;
        expect(config?.rules?.[ruleName]?.[0]).toBeGreaterThan(0);
    });
});
