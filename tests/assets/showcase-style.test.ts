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
        expect(css).toContain('min-height: 44px');
        expect(css).toContain('max-width: calc(100vw - 32px)');
        expect(css).toContain(':focus-visible');
        expect(css).toContain('height: 240px');
    });

    it('keeps text and focus tokens above required contrast', () => {
        expect(contrast('#172033', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#526079', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#0b6bcb', '#ffffff')).toBeGreaterThanOrEqual(3);
        expect(contrast('#8491a3', '#ffffff')).toBeGreaterThanOrEqual(3);
    });
});
