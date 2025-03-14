import { create } from 'zustand';

interface CounterSate {
    count: number;
    increment: () => void;
    decrement: () => void;
    incrementByAmount: (amount: number) => void;
    doubleCount: () => void;
    reset: () => void;
}

export const useCounterStore = create<CounterSate>(set => ({
    count: 0,
    increment: () => set(state => ({ count: state.count + 1 })),
    decrement: () => set(state => ({ count: state.count - 1 })),
    incrementByAmount: amount => set(state => ({ count: state.count + (amount || 0) })),
    doubleCount: () => set(state => ({ count: state.count * 2 })),
    reset: () => set({ count: 0 }),
}));
