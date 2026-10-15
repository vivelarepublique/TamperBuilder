import { useState, type ReactNode } from 'react';
import { COMPOSITION_COPY, INITIAL_COMPOSITION_FIXTURE, type CompositionStatus } from '../../common/components/composition';

export interface CompositionCardProps {
    readonly header: ReactNode;
    readonly children: ReactNode;
    readonly details: ReactNode;
    readonly actions: ReactNode;
}

export function CompositionCard({ header, children, details, actions }: CompositionCardProps) {
    return <article className='ft-showcase-composition-card' data-ft-role='composition-card'>
        <header className='ft-showcase-composition-card-header' data-ft-role='composition-card-header'>{header}</header>
        <div className='ft-showcase-composition-card-body' data-ft-role='composition-card-body'>{children}</div>
        <div className='ft-showcase-composition-card-details' data-ft-role='composition-card-details'>{details}</div>
        <footer className='ft-showcase-composition-card-footer' data-ft-role='composition-card-footer'>{actions}</footer>
    </article>;
}

export default function CompositionLab({ nickname }: { readonly nickname: string }) {
    const [expanded, setExpanded] = useState(INITIAL_COMPOSITION_FIXTURE.expanded);
    const [actionCount, setActionCount] = useState(INITIAL_COMPOSITION_FIXTURE.actionCount);
    const [status, setStatus] = useState<CompositionStatus>(INITIAL_COMPOSITION_FIXTURE.status);
    const detailsId = `ft-${nickname}-composition-details`;
    const resetDisabled = !expanded && actionCount === 0 && status === 'Ready';
    const statusCopy = actionCount === 0 ? COMPOSITION_COPY.initialStatus : `Preview action recorded. ${actionCount} total.`;

    function runPreviewAction(): void { setActionCount(count => count + 1); setStatus('Updated'); }
    function reset(): void { setExpanded(false); setActionCount(0); setStatus('Ready'); }

    return <section data-ft-role='composition-lab'>
        <p id={`ft-${nickname}-composition-description`} data-ft-role='composition-description'>{COMPOSITION_COPY.description}</p>
        <CompositionCard
            header={<><h3 data-ft-role='composition-title'>{COMPOSITION_COPY.title}</h3><span data-ft-role='composition-badge'>{status}</span></>}
            details={<div id={detailsId} data-ft-role='composition-details-content'>{expanded && <dl data-ft-role='composition-details-list'><div><dt>{COMPOSITION_COPY.environmentLabel}</dt><dd>{COMPOSITION_COPY.environmentValue}</dd></div><div><dt>{COMPOSITION_COPY.changeLabel}</dt><dd>{COMPOSITION_COPY.changeValue}</dd></div></dl>}</div>}
            actions={<div className='ft-showcase-composition-actions' data-ft-role='composition-actions'><button className='ft-showcase-button' data-ft-role='composition-details-toggle' type='button' aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded(value => !value)}>{expanded ? COMPOSITION_COPY.hideDetails : COMPOSITION_COPY.showDetails}</button><button className='ft-showcase-button' data-ft-role='composition-run' type='button' onClick={runPreviewAction}>{COMPOSITION_COPY.runAction}</button><button className='ft-showcase-button' data-ft-role='composition-reset' type='button' disabled={resetDisabled} onClick={reset}>{COMPOSITION_COPY.reset}</button></div>}
        ><p data-ft-role='composition-body'>{COMPOSITION_COPY.body}</p></CompositionCard>
        <p data-ft-role='composition-action-count'>Actions: {actionCount}</p>
        <div id={`ft-${nickname}-composition-status`} role='status' aria-live='polite' aria-atomic='true' data-ft-role='composition-status'>{statusCopy}</div>
    </section>;
}
