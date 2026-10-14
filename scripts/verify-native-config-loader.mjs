import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { findNativeConfigWarningGroups } from './native-config-warning.mjs';

const projectRoot = path.resolve(import.meta.dirname, '..');
const localCssEntry = path.join(projectRoot, 'tests/fixtures/css/safe.min.css');
const environment = { ...process.env, TAMPER_BUILDER_CSS_ENTRY: localCssEntry };

const build = spawnSync('npm', ['run', 'build', '--', '--configLoader', 'native'], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: environment,
    shell: process.platform === 'win32',
});

process.stdout.write(build.stdout ?? '');
process.stderr.write(build.stderr ?? '');

const warningGroups = findNativeConfigWarningGroups(`${build.stdout ?? ''}\n${build.stderr ?? ''}`);
if (warningGroups.length > 0) {
    console.error(`Native config loader compatibility warning detected:\n${warningGroups.join('\n')}`);
    process.exit(1);
}
if (build.status !== 0) {
    if (build.error) console.error(build.error);
    process.exit(build.status ?? 1);
}

const outputVerification = spawnSync(process.execPath, [path.join(projectRoot, 'scripts/verify-build-output.mjs')], {
    cwd: projectRoot,
    env: environment,
    stdio: 'inherit',
});
if (outputVerification.status !== 0) process.exit(outputVerification.status ?? 1);
