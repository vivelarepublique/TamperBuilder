import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const verifierSource = readFileSync(new URL('../../scripts/verify-build-output.mjs', import.meta.url), 'utf8');

describe('build output verifier', () => {
    it('resolves release relative to the script from an unrelated cwd', () => {
        const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'tamper-builder-output-verifier-'));
        const unrelatedDirectory = mkdtempSync(path.join(tmpdir(), 'tamper-builder-output-cwd-'));

        try {
            mkdirSync(path.join(fixtureRoot, 'scripts'));
            mkdirSync(path.join(fixtureRoot, 'release'));
            writeFileSync(path.join(fixtureRoot, 'scripts/verify-build-output.mjs'), verifierSource);
            writeFileSync(path.join(fixtureRoot, 'release/fixture.user.js'), 'const valid = true;\n');

            const result = spawnSync(process.execPath, [path.join(fixtureRoot, 'scripts/verify-build-output.mjs')], {
                cwd: unrelatedDirectory,
                encoding: 'utf8',
            });

            expect(result.status, result.stderr).toBe(0);
            expect(result.stdout).toContain('Verified release/fixture.user.js');
        } finally {
            rmSync(fixtureRoot, { force: true, recursive: true });
            rmSync(unrelatedDirectory, { force: true, recursive: true });
        }
    });
});
