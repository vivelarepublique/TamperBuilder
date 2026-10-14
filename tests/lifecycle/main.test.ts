import { describe, expect, it, vi } from 'vitest';

import { runMain, startMain } from '../../src/main';

describe('main lifecycle orchestration', () => {
    it('awaits before mount, every selected framework mount, and after mount in order', async () => {
        const order: string[] = [];

        await runMain({
            beforeMount: async () => {
                await Promise.resolve();
                order.push('before');
            },
            mounts: [
                () => order.push('vue'),
                async () => {
                    await Promise.resolve();
                    order.push('react');
                },
                () => order.push('preact'),
                () => order.push('lit'),
                () => order.push('svelte'),
                () => order.push('solid'),
            ],
            afterMount: () => order.push('after'),
        });

        expect(order).toEqual(['before', 'vue', 'react', 'preact', 'lit', 'svelte', 'solid', 'after']);
    });

    it('captures an unexpected top-level error exactly once', async () => {
        const error = new Error('unexpected');
        const onError = vi.fn();
        const laterMount = vi.fn();
        const afterMount = vi.fn();

        await startMain(
            {
                beforeMount: vi.fn(),
                mounts: [() => Promise.reject(error), laterMount],
                afterMount,
            },
            onError,
        );

        expect(onError).toHaveBeenCalledOnce();
        expect(onError).toHaveBeenCalledWith(error);
        expect(laterMount).not.toHaveBeenCalled();
        expect(afterMount).not.toHaveBeenCalled();
    });
});
