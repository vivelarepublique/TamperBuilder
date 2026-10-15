import { Script } from 'node:vm';
import type { Rollup, Plugin } from 'vite';
import { cssTemplate, bannerTemplate, jsTemplate, splitCssToArray } from './utilities/index.ts';
import type { PluginOption } from './interfaces/index.ts';
export type { ScriptInformationParameters } from './interfaces/index.ts';

export default function tamperBannerAndCssInjectionPlugin(config: PluginOption): Plugin {
    const { bannerConfig, beautifulCss } = config;

    return {
        name: 'vite-plugin-tamper-banner-and-css-injection',
        apply: 'build',
        enforce: 'post',
        async generateBundle(_options, bundle) {
            const jsBundleNames = Object.keys(bundle).filter(b => bundle[b].type == 'chunk' && bundle[b].fileName.endsWith('.js'));
            if (jsBundleNames.length != 1) throw new Error('There should be exactly one js bundle');
            const entry = bundle[jsBundleNames[0]] as Rollup.OutputChunk;

            const cssBundleNames = Object.keys(bundle).filter(b => bundle[b].type === 'asset' && bundle[b].fileName.endsWith('.css'));
            const allCss = cssBundleNames.reduce((accumulator, current) => {
                const cssSource = (bundle[current] as Rollup.OutputAsset).source;
                delete bundle[current];
                return accumulator + (typeof cssSource === 'string' ? cssSource : new TextDecoder().decode(cssSource));
            }, '');

            const cssCode = allCss.length === 0 ? '' : await cssTemplate(beautifulCss ? splitCssToArray(allCss).join('\n') : allCss, 'tamperTemplateInjection');
            const banner = bannerTemplate(bannerConfig);
            entry.code = jsTemplate(banner, cssCode, entry.code);

            try {
                new Script(entry.code, { filename: entry.fileName });
            } catch (error) {
                throw new Error(`Generated userscript ${entry.fileName} contains invalid JavaScript`, { cause: error });
            }
        },
    };
}
