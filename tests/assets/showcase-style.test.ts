// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.join(process.cwd(), 'src/assets/css/components/Showcase.css'), 'utf8');

function luminance(hex: string): number {
    const channels = hex.match(/[\da-f]{2}/giu)?.map(value => Number.parseInt(value, 16) / 255) ?? [];
    const linear = channels.map(value => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
    return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function contrast(first: string, second: string): number {
    const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return ((values[0] ?? 0) + 0.05) / ((values[1] ?? 0) + 0.05);
}

describe('Component Lab visual contract', () => {
    it('imports the namespaced stylesheet and scopes every selector block', () => {
        const globalCss = readFileSync(path.join(process.cwd(), 'src/assets/css/global.css'), 'utf8');
        expect(globalCss).toContain("@import './components/Showcase.css';");
        expect(css).not.toMatch(/(^|[,{]\s*)\.(?!ft-showcase-|framework-test-logo-animation)/m);
        expect(css).toContain('#framework-test-launcher-rail');
        expect(css).toContain('.ft-showcase-dialog');
    });

    it('contains responsive, containment, target-size, focus and reduced-motion rules', () => {
        expect(css).toContain('@media (max-width: 599px)');
        expect(css).toContain('@media (max-width: 767px)');
        expect(css).toContain('@media (prefers-reduced-motion: reduce)');
        expect(css).toContain('box-sizing: border-box');
        expect(css).toContain('@keyframes framework-test-scale');
        expect(css).toContain('#framework-test-launcher-rail .framework-test-logo-animation');
        expect(css).toContain('min-height: 44px');
        expect(css).toContain('max-width: calc(100vw - 32px)');
        expect(css).toContain(':focus-visible');
        expect(css).toContain('height: 240px');
    });

    it('keeps rendered controls and launcher images isolated from ordinary host rules at 390px', () => {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
        Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
        const hostStyle = document.createElement('style');
        hostStyle.textContent = 'input { appearance: auto; box-sizing: content-box; width: 900px; } button { width: 900px; max-width: 900px; height: 900px; max-height: 900px; margin: 80px; padding: 70px; } img { display: inline; width: 900px; height: 900px; margin: 50px; padding: 50px; border: 20px solid red; } dialog { box-sizing: content-box; }';
        const showcaseStyle = document.createElement('style');
        showcaseStyle.textContent = css;
        document.head.append(hostStyle, showcaseStyle);
        document.body.innerHTML = '<div id="framework-test-launcher-rail"><button class="ft-showcase-launcher"><img class="ft-showcase-launcher-image framework-test-logo-animation"></button></div><dialog class="ft-showcase-dialog"><button class="ft-showcase-button">Action</button><input class="ft-showcase-choice" type="radio"><input class="ft-showcase-choice" type="checkbox"></dialog>';

        const dialog = document.querySelector<HTMLDialogElement>('dialog')!;
        const button = document.querySelector<HTMLButtonElement>('.ft-showcase-button')!;
        const choices = [...document.querySelectorAll<HTMLInputElement>('.ft-showcase-choice')];
        const image = document.querySelector<HTMLImageElement>('.ft-showcase-launcher-image')!;
        expect(getComputedStyle(dialog).boxSizing).toBe('border-box');
        expect([
            getComputedStyle(button).width,
            getComputedStyle(button).maxWidth,
            getComputedStyle(button).height,
            getComputedStyle(button).maxHeight,
            getComputedStyle(button).margin,
            getComputedStyle(button).padding,
        ]).toEqual(['auto', '100%', 'auto', 'none', '0px', '8px 16px']);
        for (const choice of choices) {
            expect([
                getComputedStyle(choice).boxSizing,
                getComputedStyle(choice).appearance,
                getComputedStyle(choice).width,
                getComputedStyle(choice).height,
            ]).toEqual(['border-box', 'none', '44px', '44px']);
        }
        expect([getComputedStyle(image).display, getComputedStyle(image).boxSizing, getComputedStyle(image).width, getComputedStyle(image).height]).toEqual([
            'block', 'border-box', '24px', '24px',
        ]);
        expect(dialog.scrollWidth).toBeLessThanOrEqual(390);

        hostStyle.remove();
        showcaseStyle.remove();
        document.body.replaceChildren();
    });

    it('keeps text and focus tokens above required contrast', () => {
        expect(contrast('#172033', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#526079', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#0b6bcb', '#ffffff')).toBeGreaterThanOrEqual(3);
        expect(contrast('#8491a3', '#ffffff')).toBeGreaterThanOrEqual(3);
    });
});
