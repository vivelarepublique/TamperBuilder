import { useMemo, useRef } from 'preact/hooks';
import preactLogo from '../assets/svg/preact.svg';
import type { RenderLabDependencies } from '../common/components/benchmark';
import Modal from './components/Modal';
import { createPreactModel } from './signal/rootModel';

export function App({ nickname, dependencies }: { readonly nickname: string; readonly dependencies: RenderLabDependencies }) {
    const model = useMemo(createPreactModel, []);
    const launcher = useRef<HTMLButtonElement>(null);
    return <>
        <button ref={launcher} class='ft-showcase-launcher' data-ft-role='launcher' type='button' aria-label='Open Preact component lab' aria-haspopup='dialog' aria-expanded={model.open.value} onClick={() => model.openLab()}>
            <img src={preactLogo} class='ft-showcase-launcher-image framework-test-logo-animation' alt='' aria-hidden='true' /><span class='ft-showcase-launcher-label'>Open</span>
        </button>
        <Modal nickname={nickname} dependencies={dependencies} model={model} opener={launcher} />
    </>;
}
