// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    httpRequest: vi.fn(),
    hasCookie: vi.fn(),
    getCookie: vi.fn(),
    setCookie: vi.fn(),
}));

vi.mock('../../src/common/utils/tamperMonkeyFunction', () => ({ httpRequest: mocks.httpRequest }));
vi.mock('../../src/common/utils/browserCookies', () => ({ hasCookie: mocks.hasCookie, getCookie: mocks.getCookie, setCookie: mocks.setCookie }));

import { runMain } from '../../src/main';
import { updateBackgroundImage, updateCssRules } from '../../src/lifecycle/beforeMount';

describe('before-mount background handling', () => {
    beforeEach(() => {
        document.head.replaceChildren();
        document.body.removeAttribute('style');
        mocks.hasCookie.mockReturnValue(false);
    });

    it('preserves the existing background and cookie on request failure without blocking mount', async () => {
        document.body.style.backgroundImage = 'url("existing")';
        const existingStyle = document.body.getAttribute('style');
        mocks.httpRequest.mockResolvedValue({ ok: false, failure: 'network', message: 'offline', status: 0, headers: {}, finalUrl: 'https://example.test' });
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const mount = vi.fn();

        await runMain({
            beforeMount: async () => {
                await updateBackgroundImage();
            },
            mounts: [mount],
            afterMount: vi.fn(),
        });

        expect(document.body.getAttribute('style')).toBe(existingStyle);
        expect(mocks.setCookie).not.toHaveBeenCalled();
        expect(warning).toHaveBeenCalledWith('Unable to load a new background; preserving the current background.', 'network');
        expect(mount).toHaveBeenCalledOnce();
    });

    it('updates background and cookie only after a successful request', async () => {
        mocks.httpRequest.mockResolvedValue({ ok: true, status: 200, headers: {}, finalUrl: 'https://images.example.test/image.jpg', data: '' });

        await expect(updateBackgroundImage()).resolves.toEqual({ ok: true, url: 'https://images.example.test/image.jpg' });
        expect(mocks.setCookie).toHaveBeenCalledWith('backgroundImageURL', 'https://images.example.test/image.jpg', { end: Infinity });
        expect(document.body.style.backgroundImage).toContain('https://images.example.test/image.jpg');
    });

    it('writes CSS rules as text content', () => {
        updateCssRules('body::before { content: "</style><script>bad()</script>"; }');

        expect(document.head.querySelector('style')?.textContent).toContain('</style><script>bad()</script>');
        expect(document.head.querySelector('script')).toBeNull();
    });
});
