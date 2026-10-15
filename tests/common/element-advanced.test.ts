// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { createDivAppElement, getMultiDivAppElement } from '../../src/common/utils/elementAdvanced';

describe('framework launcher rail', () => {
    beforeEach(() => document.body.replaceChildren());

    it('creates ordered targets in one rail', () => {
        createDivAppElement(['vue', 'react', 'lit']);
        const rail = document.querySelector('#framework-test-launcher-rail');
        expect(rail).toBeInstanceOf(HTMLElement);
        expect(Array.from(rail!.children, child => child.id)).toEqual(['vueApp', 'reactApp', 'litApp']);
        expect(getMultiDivAppElement(['vue', 'react', 'lit']).map(target => target.id)).toEqual(['vueApp', 'reactApp', 'litApp']);
    });

    it('reuses the rail and existing targets without duplicates', () => {
        const existing = document.createElement('div');
        existing.id = 'reactApp';
        document.body.append(existing);
        createDivAppElement(['vue', 'react', 'vue']);
        createDivAppElement(['vue', 'react']);
        expect(document.querySelectorAll('#framework-test-launcher-rail')).toHaveLength(1);
        expect(document.querySelectorAll('#vueApp')).toHaveLength(1);
        expect(document.querySelectorAll('#reactApp')).toHaveLength(1);
        expect(existing.parentElement?.id).toBe('framework-test-launcher-rail');
    });
});
