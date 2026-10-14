import { spawnSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = path.resolve(import.meta.dirname, '..');
const localCssEntry = path.join(projectRoot, 'tests/fixtures/css/safe.min.css');
const environment = { ...process.env, TAMPER_BUILDER_CSS_ENTRY: localCssEntry };

function run(script) {
    const result = spawnSync('npm', ['run', script], {
        cwd: projectRoot,
        encoding: 'utf8',
        env: environment,
        shell: process.platform === 'win32',
        stdio: 'inherit',
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const buildScript of ['build', 'build:primitive', 'build:minify']) {
    run(buildScript);
    run('verify:output');
}
