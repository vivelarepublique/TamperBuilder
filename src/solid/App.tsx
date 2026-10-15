import { createSignal, Show } from 'solid-js';
import solidLogo from '../assets/svg/solid.svg';
import type { RenderLabDependencies } from '../common/components/benchmark';
import Modal from './components/Modal';
import { createWorkbenchModel, WorkbenchContext } from './signal/rootModel';

export default function App(props: { readonly nickname: string; readonly dependencies: RenderLabDependencies }) {
    const model = createWorkbenchModel();
    const [open, setOpen] = createSignal(false);
    let launcher!: HTMLButtonElement;
    return <WorkbenchContext.Provider value={model}>
        <button ref={launcher} class='ft-showcase-launcher' data-ft-role='launcher' type='button' aria-label='Open Solid component lab' aria-haspopup='dialog' aria-expanded={open()} onClick={() => setOpen(true)}><img src={solidLogo} class='ft-showcase-launcher-image framework-test-logo-animation' alt='' aria-hidden='true' /><span class='ft-showcase-launcher-label'>Open</span></button>
        <Show when={open()}><Modal nickname={props.nickname} dependencies={props.dependencies} opener={launcher} onClose={() => setOpen(false)} /></Show>
    </WorkbenchContext.Provider>;
}
