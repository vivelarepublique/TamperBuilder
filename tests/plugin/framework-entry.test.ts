// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import type { FrameworkConfiguration } from '../../config/getParameters';
import { createFrameworkEntryCode, validateFrameworkModuleGraph } from '../../plugin/vite-plugin-framework-entry';
import { createLit } from '../../src/lit';

const vueOnly: FrameworkConfiguration[] = [
    {
        framework: 'vue',
        nickname: 'vue',
        componentsFilesPaths: 'src/vue/components',
    },
];

describe('framework virtual entry', () => {
    it('generates static imports and adapters only for selected frameworks', () => {
        const code = createFrameworkEntryCode(vueOnly);

        expect(code).toContain("from \"/src/vue\"");
        expect(code).toContain('() => void mountFramework0(frameworkTargets[0])');
        expect(code).not.toMatch(/\/src\/(react|preact|lit|svelte|solid)/);
    });

    it('mounts Lit into the target generated from any valid nickname', () => {
        const code = createFrameworkEntryCode([
            {
                framework: 'lit',
                nickname: 'demo',
                componentsFilesPaths: 'src/lit/components',
            },
        ]);
        const target = document.createElement('div');
        target.id = 'demoApp';

        expect(code).toContain('const divFrameworkNicknames = ["demo"]');
        expect(code).toContain('() => void mountFramework0(frameworkTargets[0])');
        createLit(target);

        expect(target.firstElementChild?.tagName.toLowerCase()).toBe('lit-app');
    });

    it('reports unselected application and runtime modules', () => {
        const forbidden = validateFrameworkModuleGraph(vueOnly, [
            '/project/src/vue/index.ts',
            '/project/node_modules/vue/dist/vue.runtime.esm-bundler.js',
            '/project/src/react/index.tsx',
            '/project/node_modules/react/index.js',
        ]);

        expect(forbidden).toEqual(['/project/node_modules/react/index.js', '/project/src/react/index.tsx']);
    });

    it('accepts a Vue-only graph', () => {
        expect(validateFrameworkModuleGraph(vueOnly, ['/project/src/vue/index.ts', '/project/node_modules/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js'])).toEqual([]);
    });
});
