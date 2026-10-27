import { useRef, useState } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import reactLogo from '../assets/svg/react.svg';
import type { RenderLabDependencies } from '../common/components/benchmark';
import type { PanelLifecycleRegistration } from '../common/components/dialog';
import type { LifecycleLabDependencies } from '../common/components/lifecycle';
import type { PageBridgeEnvironment } from '../common/components/pageBridge';
import Modal, { type ModalHandle } from './components/Modal';
import { createWorkbenchStore, WorkbenchStoreContext, type WorkbenchState } from './store/workbenchStore';

interface AppProps {
    readonly nickname: string;
    readonly dependencies: RenderLabDependencies;
    readonly pageBridgeEnvironment: PageBridgeEnvironment;
    readonly lifecycleDependencies: LifecycleLabDependencies;
    readonly registerRootLifecycle: PanelLifecycleRegistration['register'];
}

export default function App({ nickname, dependencies, pageBridgeEnvironment, lifecycleDependencies, registerRootLifecycle }: AppProps) {
    const [store] = useState<StoreApi<WorkbenchState>>(() => createWorkbenchStore());
    const [expanded, setExpanded] = useState(false);
    const modalRef = useRef<ModalHandle>(null);
    const launcherRef = useRef<HTMLButtonElement>(null);

    return (
        <WorkbenchStoreContext value={store}>
            <button
                ref={launcherRef}
                className='ft-showcase-launcher'
                data-ft-role='launcher'
                data-ft-framework='react'
                type='button'
                aria-label='Open React component lab'
                aria-haspopup='dialog'
                aria-expanded={expanded}
                onClick={() => { if (launcherRef.current !== null) modalRef.current?.open(launcherRef.current); }}
            >
                <span className='ft-showcase-launcher-indicator' aria-hidden='true'></span>
                <span className='ft-showcase-launcher-logo' aria-hidden='true'><img src={reactLogo} className='ft-showcase-launcher-image framework-test-logo-animation' alt='' aria-hidden='true' /></span>
                <span className='ft-showcase-launcher-label'>Open</span>
            </button>
            <Modal ref={modalRef} nickname={nickname} dependencies={dependencies} pageBridgeEnvironment={pageBridgeEnvironment} lifecycleDependencies={lifecycleDependencies} registerRootLifecycle={registerRootLifecycle} onExpandedChange={setExpanded} />
        </WorkbenchStoreContext>
    );
}
