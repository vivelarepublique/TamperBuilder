import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { cssTemplate, jsTemplate } from '../../plugin/vite-plugin-tamper-banner-and-css-injection/utilities';

interface FakeTextNode {
    textContent: string;
}

interface FakeStyleElement {
    children: FakeTextNode[];
    appendChild: (node: FakeTextNode) => void;
}

const fixturesDirectory = fileURLToPath(new URL('../fixtures', import.meta.url));

function executeCssInjection(code: string) {
    const styles: FakeStyleElement[] = [];
    const context = {
        __cssProbe: false,
        document: {
            createElement: () => {
                const element: FakeStyleElement = {
                    children: [],
                    appendChild(node) {
                        this.children.push(node);
                    },
                };
                return element;
            },
            createTextNode: (textContent: string) => ({ textContent }),
            head: {
                appendChild: (element: FakeStyleElement) => styles.push(element),
            },
        },
    };

    new Script(code).runInNewContext(context);
    return { context, styles };
}

describe('cssTemplate', () => {
    it('serializes malicious CSS as inert style text', async () => {
        const maliciousCss = readFileSync(path.join(fixturesDirectory, 'malicious.css'), 'utf8');
        const generatedCode = await cssTemplate(maliciousCss, 'injectedStyle');
        const { context, styles } = executeCssInjection(generatedCode);

        expect(context.__cssProbe).toBe(false);
        expect(styles).toHaveLength(1);
        expect(styles[0].children).toHaveLength(1);
        expect(styles[0].children[0].textContent).toBe(maliciousCss);
    });

    it('escapes line and paragraph separators and passes node --check', async () => {
        const maliciousFixture = readFileSync(path.join(fixturesDirectory, 'malicious.css'), 'utf8');
        const maliciousCss = `${maliciousFixture}\u2028line separator\u2029paragraph separator`;
        const generatedCode = jsTemplate('', await cssTemplate(maliciousCss, 'injectedStyle'), 'globalThis.__scriptRan = true;');
        const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-css-'));
        const outputPath = path.join(temporaryDirectory, 'fixture.user.js');

        try {
            writeFileSync(outputPath, generatedCode, 'utf8');
            expect(generatedCode).not.toContain('\u2028');
            expect(generatedCode).not.toContain('\u2029');
            expect(generatedCode).toContain('\\u2028');
            expect(generatedCode).toContain('\\u2029');
            expect(() => execFileSync(process.execPath, ['--check', outputPath])).not.toThrow();
            expect(executeCssInjection(await cssTemplate(maliciousCss, 'injectedStyle')).styles[0].children[0].textContent).toBe(maliciousCss);
        } finally {
            rmSync(temporaryDirectory, { force: true, recursive: true });
        }
    });

    it('preserves comment-like strings in generated bundle code', () => {
        const bundleCode = `const normalize = value => value.startsWith("/*")
            ? value.replace(/\\/\\*[\\s\\S]*?\\*\\//g, "").trim()
            : value;
        globalThis.__bundleProbe = normalize("/* comment */safe");`;
        const generatedCode = jsTemplate('', '', bundleCode);
        const context = { __bundleProbe: '' };

        expect(() => new Script(generatedCode).runInNewContext(context)).not.toThrow();
        expect(context.__bundleProbe).toBe('safe');
        expect(generatedCode).toContain('value.startsWith("/*")');
    });

    it('appends one style element with exact normal CSS text', async () => {
        const css = readFileSync(path.join(fixturesDirectory, 'local.min.css'), 'utf8');
        const { styles } = executeCssInjection(await cssTemplate(css, 'injectedStyle'));

        expect(styles).toHaveLength(1);
        expect(styles[0].children[0].textContent).toBe(css);
    });
});
