import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RenderLabDependencies } from '../../common/components/benchmark';
import {
    COMPONENT_LAB_TABS,
    createPanelLifecycleRegistration,
    focusAndScrollComponentLabTab,
    getComponentLabTabForKey,
    handleDialogTab,
    keepFocusInsideDialog,
    restoreDialogOpener,
    type ComponentLabTabKey,
    type PanelLifecycleHandle,
    type PanelLifecycleRegistration,
} from '../../common/components/dialog';
import type { LifecycleLabDependencies } from '../../common/components/lifecycle';
import type { PageBridgeEnvironment } from '../../common/components/pageBridge';
import type { PreactModel } from '../signal/rootModel';
import CompositionLab from './CompositionLab';
import LifecycleLab from './LifecycleLab';
import PageBridgeLab from './PageBridgeLab';
import RenderLab from './RenderLab';
import TaskWorkbench from './TaskWorkbench';

interface ModalProps {
    readonly nickname: string;
    readonly dependencies: RenderLabDependencies;
    readonly pageBridgeEnvironment: PageBridgeEnvironment;
    readonly lifecycleDependencies: LifecycleLabDependencies;
    readonly registerRootLifecycle: PanelLifecycleRegistration['register'];
    readonly model: PreactModel;
    readonly opener: { current: HTMLButtonElement | null };
}

export default function Modal({ nickname, dependencies, pageBridgeEnvironment, lifecycleDependencies, registerRootLifecycle, model, opener }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const panelRegistration = useMemo(createPanelLifecycleRegistration, []);
    const registerLifecycle = useCallback((handle: PanelLifecycleHandle) => panelRegistration.register(handle), [panelRegistration]);
    const [activeTab, setActiveTab] = useState<ComponentLabTabKey>('task');
    const open = model.open.value;

    useEffect(() => registerRootLifecycle({ deactivate: panelRegistration.deactivateActivePanel }), [panelRegistration, registerRootLifecycle]);
    useEffect(() => {
        if (!open || dialogRef.current === null) return;
        const dialog = dialogRef.current;
        const openerElement = opener.current;
        const focusGuard = (event: FocusEvent) => keepFocusInsideDialog(event, dialog);
        dialog.showModal();
        document.addEventListener('focusin', focusGuard, true);
        queueMicrotask(() => document.getElementById(`ft-${nickname}-tab-task`)?.focus());
        return () => {
            document.removeEventListener('focusin', focusGuard, true);
            if (dialog.open) dialog.close();
            restoreDialogOpener(openerElement);
        };
    }, [nickname, open, opener]);

    function close(): void {
        panelRegistration.deactivateActivePanel();
        setActiveTab('task');
        model.closeLab();
    }

    function selectTab(tab: ComponentLabTabKey, focus = true): void {
        if (tab === activeTab) return;
        panelRegistration.deactivateActivePanel();
        setActiveTab(tab);
        if (focus) queueMicrotask(() => {
            const nextTab = document.getElementById(`ft-${nickname}-tab-${tab}`);
            if (nextTab !== null) focusAndScrollComponentLabTab(nextTab);
        });
    }

    function onTabKey(event: KeyboardEvent): void {
        const nextTab = getComponentLabTabForKey(activeTab, event.key);
        if (nextTab === null) return;
        event.preventDefault();
        selectTab(nextTab);
    }

    function panel() {
        const panelProps = { id: `ft-${nickname}-panel-${activeTab}`, role: 'tabpanel', 'aria-labelledby': `ft-${nickname}-tab-${activeTab}`, 'aria-describedby': `ft-${nickname}-${activeTab}-description` } as const;
        switch (activeTab) {
            case 'task': return <div {...panelProps}><TaskWorkbench nickname={nickname} model={model} /></div>;
            case 'render': return <div {...panelProps}><RenderLab nickname={nickname} dependencies={dependencies} registerLifecycle={registerLifecycle} /></div>;
            case 'page-bridge': return <div {...panelProps}><PageBridgeLab nickname={nickname} environment={pageBridgeEnvironment} registerLifecycle={registerLifecycle} /></div>;
            case 'composition': return <div {...panelProps}><CompositionLab nickname={nickname} /></div>;
            case 'lifecycle': return <div {...panelProps}><LifecycleLab nickname={nickname} dependencies={lifecycleDependencies} registerLifecycle={registerLifecycle} /></div>;
        }
    }

    return <dialog ref={dialogRef} class='ft-showcase-dialog' aria-labelledby={`ft-${nickname}-dialog-title`} tabIndex={-1} data-ft-role='dialog' onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (dialogRef.current) handleDialogTab(event, dialogRef.current); }}>
        <div class='ft-showcase-header'><h2 id={`ft-${nickname}-dialog-title`}>Component lab</h2><button class='ft-showcase-button' type='button' aria-label='Close component lab' onClick={close}>Close</button></div>
        <div class='ft-showcase-tabs' role='tablist' tabIndex={-1} aria-label='Component lab sections' onKeyDown={onTabKey}>
            {COMPONENT_LAB_TABS.map(tab => <button key={tab.key} id={`ft-${nickname}-tab-${tab.key}`} class='ft-showcase-tab' data-ft-role={`tab-${tab.key}`} role='tab' type='button' aria-selected={activeTab === tab.key} aria-controls={`ft-${nickname}-panel-${tab.key}`} tabIndex={activeTab === tab.key ? 0 : -1} onClick={() => selectTab(tab.key, false)}>{tab.label}</button>)}
        </div>
        {open && panel()}
    </dialog>;
}
