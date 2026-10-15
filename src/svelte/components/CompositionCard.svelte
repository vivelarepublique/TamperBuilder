<script lang="ts">
    import type { Snippet } from 'svelte';

    let { header, children, details, actions }: { header: Snippet; children: Snippet; details: Snippet; actions: Snippet } = $props();
</script>

<article class="ft-showcase-composition-card" data-ft-role="composition-card">
    <header class="ft-showcase-composition-card-header" data-ft-role="composition-card-header">{@render header()}</header>
    <div class="ft-showcase-composition-card-body" data-ft-role="composition-card-body">{@render children()}</div>
    <div class="ft-showcase-composition-card-details" data-ft-role="composition-card-details">{@render details()}</div>
    <footer class="ft-showcase-composition-card-footer" data-ft-role="composition-card-footer">{@render actions()}</footer>
</article>
