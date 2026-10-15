import { children, createMemo, createSignal, type JSX } from 'solid-js';
import { COMPOSITION_COPY, INITIAL_COMPOSITION_FIXTURE, type CompositionStatus } from '../../common/components/composition';

export interface CompositionCardProps {
    readonly header: JSX.Element;
    readonly children: JSX.Element;
    readonly details: JSX.Element;
    readonly actions: JSX.Element;
}

export function CompositionCard(props: CompositionCardProps) {
    const header = children(() => props.header);
    const body = children(() => props.children);
    const details = children(() => props.details);
    const actions = children(() => props.actions);
    return <article class='ft-showcase-composition-card' data-ft-role='composition-card'>
        <header class='ft-showcase-composition-card-header' data-ft-role='composition-card-header'>{header()}</header>
        <div class='ft-showcase-composition-card-body' data-ft-role='composition-card-body'>{body()}</div>
        <div class='ft-showcase-composition-card-details' data-ft-role='composition-card-details'>{details()}</div>
        <footer class='ft-showcase-composition-card-footer' data-ft-role='composition-card-footer'>{actions()}</footer>
    </article>;
}

export default function CompositionLab(props: { readonly nickname: string }) {
    const [expanded, setExpanded] = createSignal(INITIAL_COMPOSITION_FIXTURE.expanded);
    const [actionCount, setActionCount] = createSignal(INITIAL_COMPOSITION_FIXTURE.actionCount);
    const [status, setStatus] = createSignal<CompositionStatus>(INITIAL_COMPOSITION_FIXTURE.status);
    const detailsId = () => `ft-${props.nickname}-composition-details`;
    const resetDisabled = createMemo(() => !expanded() && actionCount() === 0 && status() === 'Ready');
    const statusCopy = createMemo(() => actionCount() === 0 ? COMPOSITION_COPY.initialStatus : `Preview action recorded. ${actionCount()} total.`);

    function runPreviewAction(): void { setActionCount(count => count + 1); setStatus('Updated'); }
    function reset(): void { setExpanded(false); setActionCount(0); setStatus('Ready'); }

    return <section data-ft-role='composition-lab'>
        <p id={`ft-${props.nickname}-composition-description`} data-ft-role='composition-description'>{COMPOSITION_COPY.description}</p>
        <CompositionCard
            header={<><h3 data-ft-role='composition-title'>{COMPOSITION_COPY.title}</h3><span data-ft-role='composition-badge'>{status()}</span></>}
            details={<div id={detailsId()} data-ft-role='composition-details-content'>{expanded() && <dl data-ft-role='composition-details-list'><div><dt>{COMPOSITION_COPY.environmentLabel}</dt><dd>{COMPOSITION_COPY.environmentValue}</dd></div><div><dt>{COMPOSITION_COPY.changeLabel}</dt><dd>{COMPOSITION_COPY.changeValue}</dd></div></dl>}</div>}
            actions={<div class='ft-showcase-composition-actions' data-ft-role='composition-actions'><button class='ft-showcase-button' data-ft-role='composition-details-toggle' type='button' aria-expanded={expanded()} aria-controls={detailsId()} onClick={() => setExpanded(value => !value)}>{expanded() ? COMPOSITION_COPY.hideDetails : COMPOSITION_COPY.showDetails}</button><button class='ft-showcase-button' data-ft-role='composition-run' type='button' onClick={runPreviewAction}>{COMPOSITION_COPY.runAction}</button><button class='ft-showcase-button' data-ft-role='composition-reset' type='button' disabled={resetDisabled()} onClick={reset}>{COMPOSITION_COPY.reset}</button></div>}
        ><p data-ft-role='composition-body'>{COMPOSITION_COPY.body}</p></CompositionCard>
        <p data-ft-role='composition-action-count'>Actions: {actionCount()}</p>
        <div id={`ft-${props.nickname}-composition-status`} role='status' aria-live='polite' aria-atomic='true' data-ft-role='composition-status'>{statusCopy()}</div>
    </section>;
}
