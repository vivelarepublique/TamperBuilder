import type { Plugin } from 'vite';
import treeShaking from './utilities/index.ts';
import type { TreeShakingOptions } from './interfaces/index.ts';

export default function linkCssTreeShakingPlugin(config: TreeShakingOptions): Plugin {
    const { manualEntry, componentsFilesPath, excludeTags, excludeClassNameKeywords, replaceVariableDeclarations } = config;
    return {
        name: 'vite-plugin-link-css-tree-shaking',
        apply: 'build',
        enforce: 'post',
        async generateBundle(_options, _bundle) {
            const minLinkCss = await treeShaking({
                manualEntry,
                componentsFilesPath,
                excludeTags: excludeTags || ['main', 'style', 'link', 'script', 'number', 'string', 'boolean', 'component', 'template', 'symbol', 'function', 'object', 'undefined'],
                excludeClassNameKeywords: excludeClassNameKeywords || 'framework-test',
                replaceVariableDeclarations: replaceVariableDeclarations || false,
            });

            this.emitFile({
                fileName: 'z-last.css',
                type: 'asset',
                source: minLinkCss.join(''),
            });
        },
    };
}
