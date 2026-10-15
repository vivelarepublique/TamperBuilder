<script setup lang="ts">
    defineSlots<{
        header(props: { region: 'header' }): unknown;
        default(props: { region: 'body' }): unknown;
        details(props: { region: 'details' }): unknown;
        actions(props: { region: 'actions' }): unknown;
    }>();
</script>

<template>
    <article class="ft-showcase-composition-card" data-ft-role="composition-card">
        <header class="ft-showcase-composition-card-header" data-ft-role="composition-card-header"><slot name="header" region="header" /></header>
        <div class="ft-showcase-composition-card-body" data-ft-role="composition-card-body"><slot region="body" /></div>
        <div class="ft-showcase-composition-card-details" data-ft-role="composition-card-details"><slot name="details" region="details" /></div>
        <footer class="ft-showcase-composition-card-footer" data-ft-role="composition-card-footer"><slot name="actions" region="actions" /></footer>
    </article>
</template>
