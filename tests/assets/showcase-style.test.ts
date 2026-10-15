// @vitest-environment jsdom

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { createReactHarness } from '../framework/harness/react';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function expectHostRuleIsolated(element: Element): void {
    const style = getComputedStyle(element);
    expect(style.display).not.toBe('none');
    expect(style.color).not.toBe('rgb(255, 0, 0)');
    expect(style.marginTop).not.toBe('99px');
}

interface BrowserLayoutResult {
    readonly clientWidth: number;
    readonly innerWidth: number;
    readonly scrollWidth: number;
    readonly undersizedTargets: readonly string[];
}

function findBrowserExecutable(): string {
    const candidates = [
        process.env.CHROME_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ];
    const executable = candidates.find((candidate): candidate is string => candidate !== undefined && existsSync(candidate));
    if (executable === undefined) {
        throw new Error('A Chrome-compatible browser is required for the Component Lab page-overflow layout contract.');
    }
    return executable;
}

function expectBrowserLayout(width: number, markup: string, hostileCss: string): void {
    const directory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-layout-'));
    const documentPath = path.join(directory, 'component-lab.html');
    const profilePath = path.join(directory, 'profile');
    const browser = findBrowserExecutable();
    const innerDocument = `<!doctype html>
        <html><head><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>${hostileCss}\n${css}</style></head><body>${markup}</body></html>`;
    const probe = `
        const frame = document.getElementById('layout-frame');
        frame.addEventListener('load', () => {
            const frameDocument = frame.contentDocument;
            const root = frameDocument.documentElement;
            const body = frameDocument.body;
            const undersizedTargets = Array.from(frameDocument.querySelectorAll('button, .ft-showcase-choice'))
                .filter(element => {
                    const rect = element.getBoundingClientRect();
                    return rect.width < 44 || rect.height < 44;
                })
                .map(element => element.getAttribute('data-ft-role') || element.className);
            const result = document.createElement('pre');
            result.id = 'layout-result';
            result.textContent = JSON.stringify({
                clientWidth: root.clientWidth,
                innerWidth: frame.contentWindow.innerWidth,
                scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
                undersizedTargets,
            });
            document.body.append(result);
        });
        frame.srcdoc = ${JSON.stringify(innerDocument)};
    `;
    writeFileSync(documentPath, `<!doctype html><html><body style="margin:0">
        <iframe id="layout-frame" style="border:0;width:${width}px;height:${width === 390 ? 844 : 900}px"></iframe>
        <script>${probe}</script></body></html>`);

    try {
        const result = spawnSync(browser, [
            '--headless=new',
            '--disable-gpu',
            `--user-data-dir=${profilePath}`,
            `--window-size=${width},${width === 390 ? 844 : 900}`,
            '--force-device-scale-factor=1',
            '--dump-dom',
            pathToFileURL(documentPath).href,
        ], { encoding: 'utf8', timeout: 30_000 });
        if (result.error !== undefined) throw result.error;
        expect(result.status, result.stderr).toBe(0);
        const match = result.stdout.match(/<pre id="layout-result">([^<]+)<\/pre>/u);
        if (match?.[1] === undefined) throw new Error('Headless browser did not return Component Lab layout measurements.');
        const layout = JSON.parse(match[1]) as BrowserLayoutResult;
        expect(layout.innerWidth).toBe(width);
        expect(layout.clientWidth).toBe(width);
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth);
        expect(layout.undersizedTargets).toEqual([]);
    } finally {
        rmSync(directory, { force: true, recursive: true });
    }
}

async function renderLabAtViewport(width: number): Promise<void> {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: width === 390 ? 844 : 900 });
    const hostStyle = document.createElement('style');
    hostStyle.textContent = `
        h2, form, p, fieldset, legend, label, ul, li, span, progress,
        dl, dt, dd, table, thead, tbody, tr, th, td {
            display: none;
            box-sizing: content-box;
            color: red;
            margin: 99px;
            padding: 99px;
            border: 10px solid red;
            font: 48px fantasy;
        }
        input { appearance: auto; box-sizing: content-box; width: 900px; }
        button { width: 900px; max-width: 900px; height: 900px; max-height: 900px; margin: 80px; padding: 70px; }
        img { display: inline; width: 900px; height: 900px; margin: 50px; padding: 50px; border: 20px solid red; }
        dialog { box-sizing: content-box; }
    `;
    const showcaseStyle = document.createElement('style');
    showcaseStyle.textContent = css;
    const rail = document.createElement('div');
    rail.id = 'framework-test-launcher-rail';
    document.head.append(hostStyle, showcaseStyle);
    document.body.appendChild(rail);
    const harness = createReactHarness();

    try {
        await harness.mount({
            dependencies: {
                scheduler: {
                    now: () => 0,
                    requestFrame: () => 1,
                    cancelFrame: () => undefined,
                    setTimer: (callback, milliseconds) => setTimeout(callback, milliseconds),
                    clearTimer: handle => clearTimeout(handle),
                },
                runScenario: options => {
                    const rows = [{ id: 1, label: 'Row 0001', revision: 0 as const }];
                    options.adapter.replaceRows(rows);
                    options.adapter.updateRows(rows);
                    options.adapter.removeRows(rows);
                    return Promise.resolve({ createMs: 1, updateMs: 1, removeMs: 1, remainingRows: 1 });
                },
            },
        });
        const target = harness.getTarget();
        rail.appendChild(target);
        act(() => target.querySelector<HTMLButtonElement>('[data-ft-role="launcher"]')?.click());
        await harness.flush();
        const dialog = target.querySelector<HTMLDialogElement>('[data-ft-role="dialog"]')!;
        const task = target.querySelector<HTMLElement>('[data-ft-role="task-workbench"]')!;

        for (const selector of ['h2', 'p', 'form', 'fieldset', 'legend', 'label', 'ul', 'li', 'span', 'progress']) {
            const element = task.querySelector(selector) ?? dialog.querySelector(selector);
            if (element === null) throw new Error(`Missing Task semantic element: ${selector}`);
            expectHostRuleIsolated(element);
            expect(getComputedStyle(element).boxSizing).toBe('border-box');
        }

        const action = target.querySelector<HTMLButtonElement>('[data-ft-role="task-add"]')!;
        const choice = target.querySelector<HTMLInputElement>('[data-ft-role="task-toggle"]')!;
        expect([getComputedStyle(action).minWidth, getComputedStyle(action).minHeight]).toEqual(['44px', '44px']);
        expect([getComputedStyle(choice).width, getComputedStyle(choice).height]).toEqual(['44px', '44px']);

        act(() => target.querySelector<HTMLButtonElement>('[data-ft-role="tab-render"]')?.click());
        await harness.flush();
        act(() => target.querySelector<HTMLButtonElement>('[data-ft-role="render-run"]')?.click());
        await harness.flush();
        for (const selector of ['dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tr', 'th', 'td']) {
            const element = target.querySelector(selector);
            if (element === null) throw new Error(`Missing Render semantic element: ${selector}`);
            expectHostRuleIsolated(element);
            expect(getComputedStyle(element).boxSizing).toBe('border-box');
        }

        expect(getComputedStyle(dialog).boxSizing).toBe('border-box');
        const image = target.querySelector<HTMLImageElement>('.ft-showcase-launcher-image')!;
        expect([getComputedStyle(image).display, getComputedStyle(image).boxSizing, getComputedStyle(image).width, getComputedStyle(image).height]).toEqual([
            'block', 'border-box', '24px', '24px',
        ]);
        expectBrowserLayout(width, rail.outerHTML, hostStyle.textContent ?? '');
    } finally {
        await harness.unmount();
        hostStyle.remove();
        showcaseStyle.remove();
        rail.remove();
    }
}

describe('Component Lab visual contract', () => {
    it('imports the namespaced stylesheet and scopes every selector block', () => {
        const globalCss = readFileSync(path.join(process.cwd(), 'src/assets/css/global.css'), 'utf8');
        expect(globalCss).toContain("@import './components/Showcase.css';");
        expect(css).not.toMatch(/(^|[,{]\s*)\.(?!ft-showcase-|framework-test-logo-animation)/m);
        expect(css).toContain('#framework-test-launcher-rail');
        expect(css).toContain('.ft-showcase-dialog');
    });

    it('contains responsive static containment without claiming jsdom layout or paint coverage', () => {
        expect(css).toContain('@media (max-width: 599px)');
        expect(css).toContain('@media (max-width: 767px)');
        expect(css).toContain('@media (prefers-reduced-motion: reduce)');
        expect(css).toContain('@keyframes framework-test-scale');
        expect(css).toContain('max-width: calc(100vw - 32px)');
        expect(css).toContain('width: calc(100vw - 16px)');
        expect(css).toContain('overflow-x: auto');
        expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
        expect(css).toContain('height: 240px');
    });

    it.each([1440, 390])('restores semantic baselines and page geometry against ordinary host rules at %ipx', async width => {
        await renderLabAtViewport(width);
    }, 60_000);

    it('uses portable backgrounds for choice indicators and preserves native input states', () => {
        expect(css).not.toMatch(/\.ft-showcase-choice::(?:before|after)/u);
        expect(css).toContain(".ft-showcase-dialog .ft-showcase-choice[type='checkbox']:checked");
        expect(css).toContain(".ft-showcase-dialog .ft-showcase-choice[type='radio']:checked");
        expect(css).toContain('.ft-showcase-dialog .ft-showcase-choice:focus-visible');
        expect(css).toContain('.ft-showcase-dialog .ft-showcase-choice:disabled');
        expect(css).toContain('background-image: radial-gradient(');
        expect(css).toContain('background-size: 10px 10px, 18px 18px, 20px 20px');
    });

    it('keeps text and focus tokens above required contrast', () => {
        expect(contrast('#172033', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#526079', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#0b6bcb', '#ffffff')).toBeGreaterThanOrEqual(3);
        expect(contrast('#8491a3', '#ffffff')).toBeGreaterThanOrEqual(3);
    });
});
