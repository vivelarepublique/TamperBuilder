import { describe, expect, it } from 'vitest';
import { COMPOSITION_COPY, INITIAL_COMPOSITION_FIXTURE } from '../../src/common/components/composition';
import type { CompositionStatus } from '../../src/common/components/composition';

describe('composition fixtures', () => {
    it('freezes the exact shared copy and initial state', () => {
        expect(COMPOSITION_COPY).toEqual({
            description: 'Compose one preview card from projected content and local actions.',
            title: 'Deployment preview',
            body: 'Preview the next Component Lab release.',
            environmentLabel: 'Environment',
            environmentValue: 'Preview',
            changeLabel: 'Change',
            changeValue: 'Five-tab component lab',
            showDetails: 'Show details',
            hideDetails: 'Hide details',
            runAction: 'Run preview action',
            reset: 'Reset',
            initialStatus: 'No preview actions yet.',
        });
        expect(INITIAL_COMPOSITION_FIXTURE).toEqual({ expanded: false, actionCount: 0, status: 'Ready' });
        expect(Object.isFrozen(COMPOSITION_COPY)).toBe(true);
        expect(Object.isFrozen(INITIAL_COMPOSITION_FIXTURE)).toBe(true);
    });

    it('exposes only the approved status values at the type boundary', () => {
        const statuses: CompositionStatus[] = ['Ready', 'Updated'];
        expect(statuses).toEqual(['Ready', 'Updated']);
    });
});
