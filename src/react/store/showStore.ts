import { create } from 'zustand';

interface ShowState {
    show: boolean;
    open: () => void;
    close: () => void;
}

export const useShowStore = create<ShowState>(set => ({
    show: false,
    open: () => set({ show: true }),
    close: () => set({ show: false }),
}));
