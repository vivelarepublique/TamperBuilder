<script setup lang="ts">
    import { ref } from 'vue';
    import Modal from './components/Modal.vue';
    import { storeToRefs } from 'pinia';
    import { useShowStore } from './store/showStore';

    const showStore = useShowStore();
    const { show } = storeToRefs(showStore);
    const { open } = showStore;

    const focus = ref(false);
</script>

<template>
    <button id="framework-test-vue-modal" class="button framework-test-modal-switch" @click="open" @mouseenter="focus = true" @mouseleave="focus = false">
        <span v-if="focus">More</span>
        <img src="../assets/svg/vue.svg" class="ft-button-logo" alt="Vue logo" />
    </button>
    <Modal v-if="show" msg="Welcome Vue"></Modal>
</template>

<style>
    #framework-test-vue-modal {
        top: 10%;
        background-color: var(--ft-border-color-vue);
    }
</style>
