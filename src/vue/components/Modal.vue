<template>
    <div class="framework-test-modal-mask" @click.stop.self="close">
        <div class="framework-test-modal-container">
            <span><button class="framework-test-modal-close-button" @click="close">&times;</button></span>

            <div class="block">
                <div class="title is-1 header-framework-test-vue">{{ msg }}</div>
                <div class="tabs is-centered is-toggle is-toggle-rounded">
                    <ul>
                        <li>
                            <button :class="{ 'button-framework-test-vue': currentView === 'VectorImage' }" @click="currentView = 'VectorImage'" class="button">Vector Image</button>
                        </li>
                        <li>
                            <button :class="{ 'button-framework-test-vue': currentView === 'Counter' }" @click="currentView = 'Counter'" class="button">Counter</button>
                        </li>
                        <li>
                            <button :class="{ 'button-framework-test-vue': currentView === 'WindowEvent' }" @click="currentView = 'WindowEvent'" class="button">Window Event</button>
                        </li>
                        <li>
                            <button :class="{ 'button-framework-test-vue': currentView === 'Benchmark' }" @click="currentView = 'Benchmark'" class="button">Benchmark</button>
                        </li>
                    </ul>
                </div>
                <component :is="componentsMap[currentView]" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    defineProps({
        msg: {
            type: String,
            required: true,
        },
    });
    import { ref } from 'vue';
    import type { Component } from 'vue';

    import VectorImage from './VectorImage.vue';
    import Counter from './Counter.vue';
    import WindowEvent from './WindowEvent.vue';
    import Benchmark from './Benchmark.vue';

    import { useShowStore } from '../store/showStore';
    const showStore = useShowStore();
    const { close } = showStore;

    const currentView = ref('VectorImage');
    const componentsMap: Record<string, Component> = {
        VectorImage,
        Counter,
        WindowEvent,
        Benchmark,
    };
</script>
