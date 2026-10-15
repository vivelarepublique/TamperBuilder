import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import svelte from 'eslint-plugin-svelte';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import lit from 'eslint-plugin-lit';
import solid from 'eslint-plugin-solid';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typescriptFiles = ['**/*.ts', '**/*.tsx'];
const browserSourceFiles = ['src/**/*.{ts,tsx}', 'src/**/*.vue', 'src/**/*.svelte'];
const compositionSourceFiles = [
    'src/{react,preact,solid}/components/Composition*.tsx',
    'src/lit/components/lit-composition-*.ts',
    'src/vue/components/Composition*.vue',
    'src/svelte/components/Composition*.svelte',
];
const nodeFiles = ['config/**/*.ts', 'plugin/**/*.ts', 'utils/**/*.ts', 'tests/**/*.ts', 'scripts/**/*.{js,mjs}', '*.config.{js,ts}', 'vite.config.ts'];
const typeProjects = [
    './tsconfig.app.json',
    './tsconfig.react.json',
    './tsconfig.preact.json',
    './tsconfig.lit.json',
    './tsconfig.solid.json',
    './tsconfig.node.json',
    './tsconfig.vue.json',
    './tsconfig.svelte.json',
    './tsconfig.eslint.json',
];

function scope(configs, files) {
    return configs.map(config => ({ ...config, files }));
}

export default [
    {
        ignores: [
            '**/node_modules/**',
            '**/release/**',
            '**/cache/**',
            '**/dist/**',
            '**/bundle/**',
            '**/.agents/**',
            '**/temp/**',
            '**/build/**',
            '**/*.tsbuildinfo',
            'tests/plugin/__snapshots__/**',
        ],
    },
    {
        ...js.configs.recommended,
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ...js.configs.recommended.languageOptions,
            globals: globals.node,
        },
    },
    ...scope(tseslint.configs.recommendedTypeChecked, typescriptFiles).map(config => ({
        ...config,
        languageOptions: {
            ...config.languageOptions,
            parserOptions: {
                ...config.languageOptions?.parserOptions,
                project: typeProjects,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    })),
    {
        files: ['scripts/native-config-warning.mjs'],
        rules: {
            // Matching terminal escape sequences necessarily includes the ESC control character.
            'no-control-regex': 'off',
        },
    },
    {
        files: ['src/index.ts'],
        rules: {
            // This compatibility entry composes adapters checked by separate framework TSConfigs.
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
    {
        files: browserSourceFiles,
        languageOptions: { globals: globals.browser },
    },
    {
        files: nodeFiles,
        languageOptions: { globals: globals.node },
    },
    {
        files: ['tests/**/*.ts'],
        languageOptions: { globals: { ...globals.node, ...globals.browser, ...globals.vitest } },
    },
    {
        files: ['src/common/utils/tamperMonkeyFunction.ts'],
        languageOptions: {
            globals: {
                GM_xmlhttpRequest: 'readonly',
                unsafeWindow: 'readonly',
            },
        },
        rules: {
            // Keep the ambient declaration reference out of the runtime bundle.
            '@typescript-eslint/triple-slash-reference': 'off',
        },
    },
    {
        files: ['src/declaration/**/*.d.ts'],
        rules: {
            // Ambient declarations mirror external userscript APIs whose payloads are not type-safe.
            '@typescript-eslint/no-explicit-any': 'off',
            // Ambient globals require `var` declarations so they merge with the global scope.
            'no-var': 'off',
        },
    },
    ...scope(vue.configs['flat/recommended'], ['**/*.vue']),
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.vue'],
            },
            globals: globals.browser,
        },
        rules: {
            // Preserve the sample templates' established wrapping and indentation while enabling Vue's correctness recommendations.
            'vue/attributes-order': 'off',
            'vue/html-indent': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
        },
    },
    {
        files: ['src/vue/components/Modal.vue'],
        rules: {
            // These showcase component names intentionally match their cross-framework peers.
            'vue/multi-word-component-names': 'off',
        },
    },
    ...scope(svelte.configs['flat/recommended'], ['**/*.svelte']),
    {
        files: ['**/*.svelte'],
        languageOptions: {
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.svelte'],
            },
            globals: globals.browser,
        },
    },
    {
        ...react.configs.flat.recommended,
        files: ['src/{react,preact}/**/*.{ts,tsx}'],
        settings: { react: { version: 'detect' } },
    },
    {
        ...react.configs.flat['jsx-runtime'],
        files: ['src/{react,preact}/**/*.{ts,tsx}'],
    },
    {
        ...reactHooks.configs.flat.recommended,
        files: ['src/{react,preact}/**/*.{ts,tsx}'],
    },
    {
        files: ['src/{react,preact}/**/*.{ts,tsx}'],
        rules: {
            // TypeScript checks component props and the automatic JSX runtime supplies React.
            'react/prop-types': 'off',
            // Existing `noopener` links may continue sending standards-compliant referrer data.
            'react/jsx-no-target-blank': ['error', { allowReferrer: true }],
        },
    },
    {
        files: ['src/preact/**/*.{ts,tsx}'],
        rules: {
            // Preact intentionally accepts DOM `class` in JSX.
            'react/no-unknown-property': ['error', { ignore: ['class'] }],
        },
    },
    {
        ...lit.configs['flat/recommended'],
        files: ['src/lit/**/*.ts'],
        rules: {
            ...lit.configs['flat/recommended'].rules,
            // Lit binds declarative event-handler methods to the component host.
            '@typescript-eslint/unbound-method': 'off',
        },
    },
    {
        ...solid.configs['flat/typescript'],
        files: ['src/solid/**/*.{ts,tsx}'],
    },
    {
        files: compositionSourceFiles,
        rules: {
            'no-restricted-syntax': [
                'error',
                {
                    selector: "MemberExpression[property.name=/^(innerHTML|outerHTML|insertAdjacentHTML|createContextualFragment|setHTML|setHTMLUnsafe|parseHTMLUnsafe)$/]",
                    message: 'Composition components must render typed framework content, not raw markup APIs.',
                },
                {
                    selector: "JSXAttribute[name.name=/^(innerHTML|dangerouslySetInnerHTML)$/]",
                    message: 'Composition components must render typed framework content, not raw markup attributes.',
                },
                {
                    selector: "NewExpression[callee.name='DOMParser']",
                    message: 'Composition components must not parse raw markup.',
                },
                {
                    selector: 'ImportDeclaration[source.value=/unsafe-html/], ImportDeclaration[source.value=/unsafe-static/]',
                    message: 'Composition components must not import raw markup directives.',
                },
                {
                    selector: "CallExpression[callee.name=/^(unsafeHTML|unsafeStatic)$/]",
                    message: 'Composition components must not invoke raw markup directives.',
                },
            ],
        },
    },
    {
        files: ['src/vue/components/Composition*.vue'],
        rules: { 'vue/no-v-html': 'error' },
    },
    {
        files: ['src/svelte/components/Composition*.svelte'],
        rules: { 'svelte/no-at-html-tags': 'error' },
    },
];
