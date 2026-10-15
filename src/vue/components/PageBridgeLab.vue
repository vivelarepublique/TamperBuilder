<script setup lang="ts">
    import { onBeforeUnmount, onMounted, ref } from 'vue';
    import {
        createPageBridgeSubscription,
        getPageBridgePage,
        type PageBridgeEnvironment,
        type PageBridgeEventKind,
        type PageBridgeObservation,
        type PageBridgeSubscription,
    } from '../../common/components/pageBridge';

    const props = defineProps<{ nickname: string; environment: PageBridgeEnvironment }>();
    const observation = ref<PageBridgeObservation>({
        page: getPageBridgePage(props.environment.hostname),
        found: false,
        displayValue: '—',
        eventKind: null,
    });
    const observedEvents = ref(0);
    const lastEvent = ref('—');
    const status = ref('');
    const fatal = ref(false);
    let subscription: PageBridgeSubscription | null = null;
    let active = false;

    function eventCopy(eventKind: PageBridgeEventKind): string {
        switch (eventKind) {
            case 'input': return 'Input';
            case 'change': return 'Change';
            case 'keyword-change': return 'Keyword changed';
            case 'demo': return 'Demo event';
        }
    }

    function commitObservation(nextObservation: PageBridgeObservation): void {
        if (!active || fatal.value) return;
        observation.value = nextObservation;
        status.value = nextObservation.found ? 'Target found.' : 'Target not found.';
        if (nextObservation.eventKind !== null) {
            observedEvents.value += 1;
            lastEvent.value = eventCopy(nextObservation.eventKind);
        }
    }

    function markFatal(): void {
        if (!active || fatal.value) return;
        fatal.value = true;
        status.value = '';
        console.error('Page bridge adapter became unavailable.');
    }

    function refresh(): void {
        if (fatal.value) return;
        subscription?.refresh();
    }

    function focusAndHighlight(): void {
        if (fatal.value) return;
        const result = subscription?.focusAndHighlight();
        if (result === 'focused') status.value = 'Target focused and highlighted.';
        else if (result === 'not-found') status.value = 'Target not found.';
        else if (result === 'failed') status.value = 'Page bridge action could not complete.';
    }

    function dispatchDemoEvent(): void {
        if (fatal.value) return;
        const result = subscription?.dispatchDemoEvent();
        if (result === 'dispatched') status.value = 'Demo event dispatched.';
        else if (result === 'not-found') status.value = 'Target not found.';
        else if (result === 'failed') status.value = 'Page bridge action could not complete.';
    }

    function reset(): void {
        if (fatal.value) return;
        subscription?.clearHighlight();
        observedEvents.value = 0;
        lastEvent.value = '—';
        subscription?.refresh();
    }

    function deactivate(): void {
        if (!active && subscription === null) return;
        active = false;
        subscription?.dispose();
        subscription = null;
    }

    defineExpose({ deactivate });
    onMounted(() => {
        active = true;
        try {
            subscription = createPageBridgeSubscription(props.environment, commitObservation, markFatal);
            subscription.start();
        } catch {
            markFatal();
        }
    });
    onBeforeUnmount(deactivate);
</script>

<template>
    <section data-ft-role="page-bridge-lab">
        <p :id="`ft-${nickname}-page-bridge-description`" data-ft-role="page-bridge-description">Observe a supported page search input without changing its value.</p>
        <dl class="ft-showcase-page-bridge-summary" data-ft-role="page-bridge-summary">
            <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-target-status"><dt>Target status</dt><dd>{{ observation.found ? 'Found' : 'Not found' }}</dd></div>
            <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-page"><dt>Page</dt><dd>{{ observation.page }}</dd></div>
            <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-current-input-item"><dt>Current input</dt><dd><output class="ft-showcase-page-bridge-value" data-ft-role="page-bridge-current-input">{{ observation.displayValue }}</output></dd></div>
            <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-observed-events"><dt>Observed events</dt><dd>{{ observedEvents }}</dd></div>
            <div class="ft-showcase-page-bridge-item" data-ft-role="page-bridge-last-event"><dt>Last event</dt><dd>{{ lastEvent }}</dd></div>
        </dl>
        <div class="ft-showcase-page-bridge-actions" data-ft-role="page-bridge-actions">
            <button class="ft-showcase-button" data-ft-role="page-bridge-refresh" type="button" :disabled="fatal" @click="refresh">Refresh target</button>
            <button class="ft-showcase-button" data-ft-role="page-bridge-focus" type="button" :disabled="fatal" @click="focusAndHighlight">Focus &amp; highlight</button>
            <button class="ft-showcase-button" data-ft-role="page-bridge-demo" type="button" :disabled="fatal" @click="dispatchDemoEvent">Dispatch demo event</button>
            <button class="ft-showcase-button" data-ft-role="page-bridge-reset" type="button" :disabled="fatal" @click="reset">Reset</button>
        </div>
        <div :id="`ft-${nickname}-page-bridge-status`" role="status" aria-live="polite" aria-atomic="true" data-ft-role="page-bridge-status">{{ status }}</div>
        <div data-ft-role="page-bridge-error-slot">
            <div v-if="fatal" :id="`ft-${nickname}-page-bridge-error`" class="ft-showcase-error" role="alert">Page bridge is unavailable.</div>
        </div>
    </section>
</template>
