import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputDirectory = path.join(projectRoot, 'release');
const localCssEntry = path.join(projectRoot, 'tests/fixtures/css/safe.min.css');
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-frameworks-'));
const budgets = {
    showcase: 2 * 1024 * 1024,
    vue: 750 * 1024,
};

function run(command, args, environment = {}) {
    const result = spawnSync(command, args, {
        cwd: projectRoot,
        encoding: 'utf8',
        env: { ...process.env, ...environment },
        shell: process.platform === 'win32',
    });
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
    }
}

function findUserscript() {
    const files = readdirSync(outputDirectory).filter(file => file.endsWith('.user.js'));
    if (files.length !== 1) throw new Error(`Expected one userscript, found ${files.length}`);
    return path.join(outputDirectory, files[0]);
}

function buildAndInspect(name, environment, budget) {
    const reportPath = path.join(temporaryDirectory, `${name}-modules.json`);
    run('npm', ['run', 'build'], { ...environment, TAMPER_BUILDER_CSS_ENTRY: localCssEntry, TAMPER_BUILDER_MODULE_REPORT: reportPath });
    run(process.execPath, [path.join(projectRoot, 'scripts/verify-build-output.mjs')]);
    const outputPath = findUserscript();
    const size = statSync(outputPath).size;
    if (size > budget) throw new Error(`${name} output is ${size} bytes, above its ${budget}-byte budget`);
    return {
        report: JSON.parse(readFileSync(reportPath, 'utf8')),
        size,
    };
}

try {
    const showcase = buildAndInspect('showcase', {}, budgets.showcase);
    if (showcase.report.selected.length !== 6) {
        throw new Error(`Expected six selected showcase frameworks, found ${showcase.report.selected.length}`);
    }

    const vue = buildAndInspect(
        'vue',
        { TAMPER_BUILDER_FRAMEWORK_CONFIG: path.join(projectRoot, 'tests/fixtures/config/vue-only.yaml') },
        budgets.vue,
    );
    const forbiddenPatterns = [
        /\/src\/(react|preact|lit|svelte|solid)\//,
        /\/node_modules\/(react|react-dom|zustand|preact|@preact|lit|@lit|lit-element|lit-html|svelte|solid-js)\//,
    ];
    const normalizedModules = vue.report.modules.map(moduleId => moduleId.replaceAll('\\', '/'));
    const forbiddenModules = normalizedModules.filter(moduleId => forbiddenPatterns.some(pattern => pattern.test(moduleId)));
    if (forbiddenModules.length > 0) {
        throw new Error(`Vue-only graph contains forbidden modules:\n${forbiddenModules.join('\n')}`);
    }
    if (vue.size >= showcase.size) {
        throw new Error(`Vue-only output (${vue.size} bytes) must be smaller than showcase output (${showcase.size} bytes)`);
    }

    console.log(`Framework selection verified: showcase=${showcase.size} bytes, Vue-only=${vue.size} bytes; unselected sources and runtimes absent.`);
} finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
}
