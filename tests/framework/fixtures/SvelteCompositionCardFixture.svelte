<script lang="ts">
    import CompositionCard from '../../../src/svelte/components/CompositionCard.svelte';

    let { onAction }: { onAction: () => void } = $props();
</script>

{#snippet header()}<button type="button" data-sentinel="header">Header sentinel</button>{/snippet}
{#snippet details()}<button type="button" data-sentinel="details">Details sentinel</button>{/snippet}
{#snippet actions()}<button type="button" data-sentinel="actions" onclick={onAction}>Actions sentinel</button>{/snippet}
<CompositionCard {header} {details} {actions}><button type="button" data-sentinel="body">Body sentinel</button></CompositionCard>
