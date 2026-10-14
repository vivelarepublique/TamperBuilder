import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const outputDirectory = path.join(projectRoot, 'release');

async function listFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await listFiles(entryPath)));
        } else {
            files.push(entryPath);
        }
    }
    return files;
}

let files;
try {
    files = await listFiles(outputDirectory);
} catch (error) {
    throw new Error(`Unable to inspect build output at ${outputDirectory}`, { cause: error });
}

const userScripts = files.filter(file => file.endsWith('.user.js'));
if (userScripts.length !== 1) {
    throw new Error(`Expected exactly one .user.js file in release, found ${userScripts.length}`);
}

const cssAssets = files.filter(file => file.endsWith('.css'));
if (cssAssets.length !== 0) {
    throw new Error(`Expected no standalone CSS assets, found: ${cssAssets.join(', ')}`);
}

const syntaxCheck = spawnSync(process.execPath, ['--check', userScripts[0]], { encoding: 'utf8' });
if (syntaxCheck.status !== 0) {
    throw new Error(`Generated userscript failed node --check:\n${syntaxCheck.stderr || syntaxCheck.stdout}`);
}

console.log(`Verified ${path.relative(projectRoot, userScripts[0])}: one userscript, no CSS assets, valid JavaScript syntax.`);
