import preact from '@preact/preset-vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import react from '@vitejs/plugin-react';
import vue from '@vitejs/plugin-vue';
import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [
        vue(),
        react({ include: ['src/react/**/*.{tsx,ts,jsx,js}'] }),
        preact({ include: ['src/preact/**/*.{tsx,ts,jsx,js}'], reactAliasesEnabled: false, babel: {} }),
        svelte({ preprocess: vitePreprocess() }),
        solid({ include: ['src/solid/**/*.{tsx,ts,jsx,js}'] }),
    ],
    test: {
        clearMocks: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup/native-dialog.ts'],
    },
});
