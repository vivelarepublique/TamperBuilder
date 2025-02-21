import { ref } from 'vue';
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', () => {
    const count = ref<number>(0);

    function increment() {
        count.value++;
    }

    function decrement() {
        count.value--;
    }

    function incrementByAmount(amount: number) {
        count.value += amount || 0;
    }

    function doubleCount() {
        count.value *= 2;
    }

    function reset() {
        count.value = 0;
    }

    return { count, increment, decrement, incrementByAmount, doubleCount, reset };
});
