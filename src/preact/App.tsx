import { useMemo, useRef } from 'preact/hooks';
import preactLogo from '../assets/svg/preact.svg';
import type { RenderLabDependencies } from '../common/components/benchmark';
import type { PanelLifecycleRegistration } from '../common/components/dialog';
import type { LifecycleLabDependencies } from '../common/components/lifecycle';
import type { PageBridgeEnvironment } from '../common/components/pageBridge';
import Modal from './components/Modal';
import { createPreactModel } from './signal/rootModel';

interface AppProps {
    readonly nickname: string;
    readonly dependencies: RenderLabDependencies;
    readonly pageBridgeEnvironment: PageBridgeEnvironment;
    readonly lifecycleDependencies: LifecycleLabDependencies;
    readonly registerRootLifecycle: PanelLifecycleRegistration['register'];
}

export function App({ nickname, dependencies, pageBridgeEnvironment, lifecycleDependencies, registerRootLifecycle }: AppProps) {
    const model = useMemo(createPreactModel, []);
    const launcher = useRef<HTMLButtonElement>(null);
    return <>
        <button ref={launcher} class='ft-showcase-launcher' data-ft-role='launcher' data-ft-framework='preact' type='button' aria-label='Open Preact component lab' aria-haspopup='dialog' aria-expanded={model.open.value} onClick={() => model.openLab()}>
            <span class='ft-showcase-launcher-indicator' aria-hidden='true'></span><span class='ft-showcase-launcher-logo' aria-hidden='true'><img src={preactLogo} class='ft-showcase-launcher-image framework-test-logo-animation' alt='' aria-hidden='true' /></span><span class='ft-showcase-launcher-label'>Open</span>
        </button>
        <Modal nickname={nickname} dependencies={dependencies} pageBridgeEnvironment={pageBridgeEnvironment} lifecycleDependencies={lifecycleDependencies} registerRootLifecycle={registerRootLifecycle} model={model} opener={launcher} />
    </>;
}
