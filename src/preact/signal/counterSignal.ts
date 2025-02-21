import { signal } from '@preact/signals';

export const count = signal<number>(0);

export const increment = () => {
    count.value++;
};

export const decrement = () => {
    count.value--;
};

export const incrementByAmount = (amount: number) => {
    count.value += amount;
};

export const doubleCount = () => {
    count.value *= 2;
};

export const reset = () => {
    count.value = 0;
};
