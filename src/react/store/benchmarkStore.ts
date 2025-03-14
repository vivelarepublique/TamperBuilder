import { create } from 'zustand';

import type { RandomColor } from '../../common/components/benchmark';
import { generateRandomColor } from '../../common/components/benchmark';

interface BenchmarkState {
    divList: RandomColor[];
    emptyRandomColorDiv: () => void;
    addRandomColorDiv: (count: number) => void;
}

export const useBenchmarkStore = create<BenchmarkState>(set => ({
    divList: [] as RandomColor[],
    emptyRandomColorDiv: () => set({ divList: [] }),
    addRandomColorDiv: count => {
        const countBefore = count > 0 ? count : 0;
        const tempRandomColorDiv: RandomColor[] = [];
        for (let i = 0; i < countBefore; i++) {
            const randomColor = generateRandomColor(i);
            tempRandomColorDiv.push(randomColor);
        }
        set({ divList: tempRandomColorDiv });
    },
}));
