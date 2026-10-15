<script lang="ts">
    import { COMPOSITION_COPY, INITIAL_COMPOSITION_FIXTURE, type CompositionStatus } from '../../common/components/composition';
    import CompositionCard from './CompositionCard.svelte';

    let { nickname }: { nickname: string } = $props();
    let expanded = $state(INITIAL_COMPOSITION_FIXTURE.expanded);
    let actionCount = $state(INITIAL_COMPOSITION_FIXTURE.actionCount);
    let status = $state<CompositionStatus>(INITIAL_COMPOSITION_FIXTURE.status);
    let detailsId = $derived(`ft-${nickname}-composition-details`);
    let resetDisabled = $derived(!expanded && actionCount === 0 && status === 'Ready');
    let statusCopy = $derived(actionCount === 0 ? COMPOSITION_COPY.initialStatus : `Preview action recorded. ${actionCount} total.`);

    function runPreviewAction(): void { actionCount += 1; status = 'Updated'; }
    function reset(): void { expanded = false; actionCount = 0; status = 'Ready'; }
</script>

<section data-ft-role="composition-lab">
    <p id={`ft-${nickname}-composition-description`} data-ft-role="composition-description">{COMPOSITION_COPY.description}</p>
    {#snippet header()}<h3 data-ft-role="composition-title">{COMPOSITION_COPY.title}</h3><span data-ft-role="composition-badge">{status}</span>{/snippet}
    {#snippet details()}<div id={detailsId} data-ft-role="composition-details-content">{#if expanded}<dl data-ft-role="composition-details-list"><div><dt>{COMPOSITION_COPY.environmentLabel}</dt><dd>{COMPOSITION_COPY.environmentValue}</dd></div><div><dt>{COMPOSITION_COPY.changeLabel}</dt><dd>{COMPOSITION_COPY.changeValue}</dd></div></dl>{/if}</div>{/snippet}
    {#snippet actions()}<div class="ft-showcase-composition-actions" data-ft-role="composition-actions"><button class="ft-showcase-button" data-ft-role="composition-details-toggle" type="button" aria-expanded={expanded} aria-controls={detailsId} onclick={() => expanded = !expanded}>{expanded ? COMPOSITION_COPY.hideDetails : COMPOSITION_COPY.showDetails}</button><button class="ft-showcase-button" data-ft-role="composition-run" type="button" onclick={runPreviewAction}>{COMPOSITION_COPY.runAction}</button><button class="ft-showcase-button" data-ft-role="composition-reset" type="button" disabled={resetDisabled} onclick={reset}>{COMPOSITION_COPY.reset}</button></div>{/snippet}
    <CompositionCard {header} {details} {actions}><p data-ft-role="composition-body">{COMPOSITION_COPY.body}</p></CompositionCard>
    <p data-ft-role="composition-action-count">Actions: {actionCount}</p>
    <div id={`ft-${nickname}-composition-status`} role="status" aria-live="polite" aria-atomic="true" data-ft-role="composition-status">{statusCopy}</div>
</section>
