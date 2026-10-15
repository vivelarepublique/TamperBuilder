import type { Plugin } from 'vite';
import treeShaking from './utilities/index.ts';
import type { TreeShakingOptions } from './interfaces/index.ts';

export default function linkCssTreeShakingPlugin(config: TreeShakingOptions): Plugin {
    return {
        name: 'vite-plugin-link-css-tree-shaking',
        apply: 'build',
        enforce: 'post',
        async generateBundle(_options, _bundle) {
            const minLinkCss = await treeShaking({
                ...config,
                excludeTags: config.excludeTags || ['main', 'style', 'link', 'script', 'number', 'string', 'boolean', 'component', 'template', 'symbol', 'function', 'object', 'undefined'],
                excludeClassNameKeywords: config.excludeClassNameKeywords || 'framework-test',
                replaceVariableDeclarations: config.replaceVariableDeclarations || false,
            });

            this.emitFile({
                fileName: 'z-last.css',
                type: 'asset',
                source: minLinkCss.join(''),
            });
        },
    };
}
