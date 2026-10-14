import { describe, expect, it } from 'vitest';
import { findNativeConfigWarningGroups, NATIVE_CONFIG_WARNING_HEADER } from '../../scripts/native-config-warning.mjs';

const nativeConfigWarning = [
    NATIVE_CONFIG_WARNING_HEADER,
    '  - import "./utilities" resolves to a directory index (plugin/example.ts:1:20). Import the index file directly',
    '  - import "./config" without a file extension (vite.config.ts:1:20). Add the file extension',
    '  - JSON import "./package.json" without import attributes (plugin/version.ts:1:20). Add import attributes',
].join('\n');

describe('native config warning matcher', () => {
    it('matches Vite native-loader compatibility warning groups exactly', () => {
        expect(findNativeConfigWarningGroups(`before\n${nativeConfigWarning}\nafter`)).toEqual([nativeConfigWarning]);
    });

    it('does not classify unrelated warnings as native-loader compatibility failures', () => {
        const unrelatedWarnings = [
            '(!) Some chunks are larger than 500 kB after minification.',
            '[vite-plugin-svelte] no Svelte config found - using default configuration.',
            'Set an unrelated warning option to suppress this warning.',
        ].join('\n');

        expect(findNativeConfigWarningGroups(unrelatedWarnings)).toEqual([]);
    });
});
