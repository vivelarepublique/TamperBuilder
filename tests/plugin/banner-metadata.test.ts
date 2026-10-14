import { describe, expect, it } from 'vitest';
import { loadBannerConfig } from '../../config/getParameters';
import { bannerTemplate } from '../../plugin/vite-plugin-tamper-banner-and-css-injection/utilities';

describe('userscript metadata', () => {
    it('renders only explicitly validated grants and connect hosts', () => {
        const metadata = bannerTemplate(loadBannerConfig());

        expect(metadata).toMatchSnapshot();
        expect(metadata).toContain('// @grant        GM_xmlhttpRequest');
        expect(metadata).toContain('// @grant        unsafeWindow');
        expect(metadata).toContain('// @connect      dailybing.com');
        expect(metadata).not.toContain('window.onurlchange');
        expect(metadata).not.toMatch(/(?:vuejs|reactjs|preactjs|lit\.dev|svelte|solidjs)\./);
    });
});
