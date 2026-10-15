<script setup lang="ts">
    import { computed, ref } from 'vue';
    import { COMPOSITION_COPY, INITIAL_COMPOSITION_FIXTURE, type CompositionStatus } from '../../common/components/composition';
    import CompositionCard from './CompositionCard.vue';

    const props = defineProps<{ nickname: string }>();
    const expanded = ref(INITIAL_COMPOSITION_FIXTURE.expanded);
    const actionCount = ref(INITIAL_COMPOSITION_FIXTURE.actionCount);
    const status = ref<CompositionStatus>(INITIAL_COMPOSITION_FIXTURE.status);
    const detailsId = computed(() => `ft-${props.nickname}-composition-details`);
    const resetDisabled = computed(() => !expanded.value && actionCount.value === 0 && status.value === 'Ready');
    const statusCopy = computed(() => actionCount.value === 0 ? COMPOSITION_COPY.initialStatus : `Preview action recorded. ${actionCount.value} total.`);

    function toggleDetails(): void { expanded.value = !expanded.value; }
    function runPreviewAction(): void { actionCount.value += 1; status.value = 'Updated'; }
    function reset(): void { expanded.value = false; actionCount.value = 0; status.value = 'Ready'; }
</script>

<template>
    <section data-ft-role="composition-lab">
        <p :id="`ft-${nickname}-composition-description`" data-ft-role="composition-description">{{ COMPOSITION_COPY.description }}</p>
        <CompositionCard>
            <template #header="{ region }"><h3 :key="region" data-ft-role="composition-title">{{ COMPOSITION_COPY.title }}</h3><span data-ft-role="composition-badge">{{ status }}</span></template>
            <template #default="{ region }"><p :key="region" data-ft-role="composition-body">{{ COMPOSITION_COPY.body }}</p></template>
            <template #details="{ region }"><div :id="detailsId" :key="region" data-ft-role="composition-details-content"><dl v-if="expanded" data-ft-role="composition-details-list"><div><dt>{{ COMPOSITION_COPY.environmentLabel }}</dt><dd>{{ COMPOSITION_COPY.environmentValue }}</dd></div><div><dt>{{ COMPOSITION_COPY.changeLabel }}</dt><dd>{{ COMPOSITION_COPY.changeValue }}</dd></div></dl></div></template>
            <template #actions="{ region }"><div :key="region" class="ft-showcase-composition-actions" data-ft-role="composition-actions"><button class="ft-showcase-button" data-ft-role="composition-details-toggle" type="button" :aria-expanded="expanded" :aria-controls="detailsId" @click="toggleDetails">{{ expanded ? COMPOSITION_COPY.hideDetails : COMPOSITION_COPY.showDetails }}</button><button class="ft-showcase-button" data-ft-role="composition-run" type="button" @click="runPreviewAction">{{ COMPOSITION_COPY.runAction }}</button><button class="ft-showcase-button" data-ft-role="composition-reset" type="button" :disabled="resetDisabled" @click="reset">{{ COMPOSITION_COPY.reset }}</button></div></template>
        </CompositionCard>
        <p data-ft-role="composition-action-count">Actions: {{ actionCount }}</p>
        <div :id="`ft-${nickname}-composition-status`" role="status" aria-live="polite" aria-atomic="true" data-ft-role="composition-status">{{ statusCopy }}</div>
    </section>
</template>
