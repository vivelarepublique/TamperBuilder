const ANSI_ESCAPE_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;

export const NATIVE_CONFIG_WARNING_HEADER =
    "(!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:";

export function findNativeConfigWarningGroups(output) {
    const lines = output.replace(ANSI_ESCAPE_PATTERN, '').replaceAll('\r', '').split('\n');
    const groups = [];

    for (let index = 0; index < lines.length; index += 1) {
        if (lines[index] !== NATIVE_CONFIG_WARNING_HEADER) continue;

        let endIndex = index + 1;
        while (lines[endIndex]?.startsWith('  - ')) endIndex += 1;
        if (endIndex === index + 1) continue;

        groups.push(lines.slice(index, endIndex).join('\n'));
        index = endIndex - 1;
    }

    return groups;
}
