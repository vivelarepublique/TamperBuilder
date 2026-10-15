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

const compositionPaths = [
    'src/vue/components/CompositionCard.vue',
    'src/vue/components/CompositionLab.vue',
    'src/react/components/CompositionLab.tsx',
    'src/preact/components/CompositionLab.tsx',
    'src/solid/components/CompositionLab.tsx',
    'src/lit/components/lit-composition-card.ts',
    'src/lit/components/lit-composition-lab.ts',
    'src/svelte/components/CompositionCard.svelte',
    'src/svelte/components/CompositionLab.svelte',
];

const forbiddenCompositionSources = [
    ['innerHTML', "const target = document.body; target.innerHTML = '<b>unsafe</b>';", 'src/react/components/CompositionLab.tsx', 'no-restricted-syntax'],
    ['outerHTML', "const target = document.body; target.outerHTML = '<b>unsafe</b>';", 'src/react/components/CompositionLab.tsx', 'no-restricted-syntax'],
    ['insertAdjacentHTML', "document.body.insertAdjacentHTML('beforeend', '<b>unsafe</b>');", 'src/react/components/CompositionLab.tsx', 'no-restricted-syntax'],
    ['dangerouslySetInnerHTML', "export const Example = () => <div dangerouslySetInnerHTML={{ __html: '<b>unsafe</b>' }} />;", 'src/react/components/CompositionLab.tsx', 'no-restricted-syntax'],
    ['DOMParser', "new DOMParser().parseFromString('<b>unsafe</b>', 'text/html');", 'src/react/components/CompositionLab.tsx', 'no-restricted-syntax'],
    ['createContextualFragment', "document.createRange().createContextualFragment('<b>unsafe</b>');", 'src/react/components/CompositionLab.tsx', 'no-restricted-syntax'],
    ['setHTMLUnsafe', "document.body.setHTMLUnsafe('<b>unsafe</b>');", 'src/react/components/CompositionLab.tsx', 'no-restricted-syntax'],
    ['unsafeHTML', "import { unsafeHTML } from 'lit/directives/unsafe-html.js'; unsafeHTML('<b>unsafe</b>');", 'src/lit/components/lit-composition-lab.ts', 'no-restricted-syntax'],
    ['unsafeStatic', "import { unsafeStatic } from 'lit/static-html.js'; unsafeStatic('<b>unsafe</b>');", 'src/lit/components/lit-composition-lab.ts', 'no-restricted-syntax'],
    ['Vue v-html', '<script setup lang="ts">const markup = \'<b>unsafe</b>\';</script><template><div v-html="markup" /></template>', 'src/vue/components/CompositionLab.vue', 'vue/no-v-html'],
    ['Svelte @html', '<script lang="ts">const markup = \'<b>unsafe</b>\';</script><div>{@html markup}</div>', 'src/svelte/components/CompositionLab.svelte', 'svelte/no-at-html-tags'],
] as const;

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

    it.each(compositionPaths)('accepts typed Composition source %s', async filePath => {
        const [result] = await eslint.lintFiles(path.join(projectRoot, filePath));
        expect(result?.messages).toEqual([]);
    });

    it.each(forbiddenCompositionSources)('rejects %s in Composition source', async (_name, source, filePath, ruleName) => {
        const [result] = await eslint.lintText(source, { filePath: path.join(projectRoot, filePath) });
        expect(result?.messages.some(message => message.ruleId === ruleName)).toBe(true);
    });
});
