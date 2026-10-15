<template>
    <div class="block">
        <div class="subtitle is-2 header-framework-test-vue">Counter, Count is {{ count }}</div>

        <div class="columns">
            <div class="column">
                <button class="button button-framework-test-vue" @click="increment">Increment</button>
            </div>
            <div class="column">
                <button class="button button-framework-test-vue" @click="decrement">Decrement</button>
            </div>
            <div class="column">
                <div class="field has-addons">
                    <div class="control">
                        <input class="input" type="number" placeholder="Amount" v-model="amount">
                    </div>
                    <div class="control">
                        <button class="button button-framework-test-vue" @click="incrementByAmount(amount)">Increment By Amount</button>
                    </div>
                </div>
            </div>
            <div class="column">
                <button class="button button-framework-test-vue" @click="doubleCount">Double Count</button>
            </div>
            <div class="column">
                <button class="button button-framework-test-vue" @click="reset">Reset</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useCounterStore } from '../store/counterStore';

    const counterStore = useCounterStore();
    const { count } = storeToRefs(counterStore);
    const { increment, decrement, incrementByAmount, doubleCount, reset } = counterStore;

    const amount = ref(0);
</script>
