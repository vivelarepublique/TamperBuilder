import { useRef, useState } from 'react';
import type { StoreApi } from 'zustand/vanilla';
import reactLogo from '../assets/svg/react.svg';
import type { RenderLabDependencies } from '../common/components/benchmark';
import Modal, { type ModalHandle } from './components/Modal';
import { createWorkbenchStore, WorkbenchStoreContext, type WorkbenchState } from './store/workbenchStore';

export default function App({ nickname, dependencies }: { readonly nickname: string; readonly dependencies: RenderLabDependencies }) {
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
                type='button'
                aria-label='Open React component lab'
                aria-haspopup='dialog'
                aria-expanded={expanded}
                onClick={() => { if (launcherRef.current !== null) modalRef.current?.open(launcherRef.current); }}
            >
                <img src={reactLogo} className='ft-showcase-launcher-image framework-test-logo-animation' alt='' aria-hidden='true' />
                <span className='ft-showcase-launcher-label'>Open</span>
            </button>
            <Modal ref={modalRef} nickname={nickname} dependencies={dependencies} onExpandedChange={setExpanded} />
        </WorkbenchStoreContext>
    );
}
