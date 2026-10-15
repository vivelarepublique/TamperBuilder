<template>
    <div class="block">
        <div class="subtitle is-2 header-framework-test-vue">Benchmark, Spend Time: {{ duration }} ms</div>

        <div class="field">
            <label class="label">Render Number</label>
            <div class="control">
                <input type="number" class="input" placeholder="Render Number" v-model="count">
            </div>
        </div>

        <div class="field is-grouped">
            <div class="control">
                <button class="button is-large button-framework-test-vue" @click="_render">Render</button>
            </div>
            <div class="control">
                <button class="button is-large button-framework-test-vue" @click="emptyRandomColorDiv">Empty</button>
            </div>
        </div>

        <div class="columns is-multiline">
            <div v-for="ds in divList" :key="ds.id" class="column is-1" :style="{ 'background-color': ds.backgroundColor, color: ds.color, fontSize: '8px' }">Div# {{ ds.id }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue';
    import { storeToRefs } from 'pinia';
    import { useBenchmarkStore } from '../store/benchmarkStore';

    import { measureRenderTime } from '../../common/components/benchmark';

    const benchMarkStore = useBenchmarkStore();
    const { divList } = storeToRefs(benchMarkStore);
    const { addRandomColorDiv, emptyRandomColorDiv } = benchMarkStore;

    const count = ref(0);
    const duration = ref(0);

    function updateDuration(time: number) {
        duration.value = time;
    }

    function _render() {
        measureRenderTime(addRandomColorDiv, count.value, updateDuration);
    }
</script>
