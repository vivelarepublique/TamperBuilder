<script setup lang="ts">
    import { ref } from 'vue';
    import type { RenderLabDependencies } from '../common/components/benchmark';
    import type { PanelLifecycleRegistration } from '../common/components/dialog';
    import type { LifecycleLabDependencies } from '../common/components/lifecycle';
    import type { PageBridgeEnvironment } from '../common/components/pageBridge';
    import vueLogo from '../assets/svg/vue.svg';
    import Modal from './components/Modal.vue';

    defineProps<{
        nickname: string;
        dependencies: RenderLabDependencies;
        pageBridgeEnvironment: PageBridgeEnvironment;
        lifecycleDependencies: LifecycleLabDependencies;
        registerRootLifecycle: PanelLifecycleRegistration['register'];
    }>();
    const modal = ref<InstanceType<typeof Modal> | null>(null);
    const launcher = ref<HTMLButtonElement | null>(null);
    const expanded = ref(false);

    function open(): void {
        if (launcher.value !== null) void modal.value?.open(launcher.value);
    }
</script>

<template>
    <button ref="launcher" class="ft-showcase-launcher" data-ft-role="launcher" type="button" :aria-label="`Open Vue component lab`" aria-haspopup="dialog" :aria-expanded="expanded" @click="open">
        <img :src="vueLogo" class="ft-showcase-launcher-image framework-test-logo-animation" alt="" aria-hidden="true">
        <span class="ft-showcase-launcher-label">Open</span>
    </button>
    <Modal ref="modal" :nickname="nickname" :dependencies="dependencies" :page-bridge-environment="pageBridgeEnvironment" :lifecycle-dependencies="lifecycleDependencies" :register-root-lifecycle="registerRootLifecycle" @expanded="expanded = $event" />
</template>
