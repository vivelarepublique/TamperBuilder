import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
import CompositionLab from './CompositionLab';
import LifecycleLab from './LifecycleLab';
import PageBridgeLab from './PageBridgeLab';
import RenderLab from './RenderLab';
import TaskWorkbench from './TaskWorkbench';

export interface ModalHandle {
    open(source: HTMLElement): void;
    close(restoreFocus?: boolean): void;
}

interface ModalProps {
    readonly nickname: string;
    readonly dependencies: RenderLabDependencies;
    readonly pageBridgeEnvironment: PageBridgeEnvironment;
    readonly lifecycleDependencies: LifecycleLabDependencies;
    readonly registerRootLifecycle: PanelLifecycleRegistration['register'];
    readonly onExpandedChange: (expanded: boolean) => void;
}

const Modal = forwardRef<ModalHandle, ModalProps>(function Modal({ nickname, dependencies, pageBridgeEnvironment, lifecycleDependencies, registerRootLifecycle, onExpandedChange }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const panelRegistrationRef = useRef<PanelLifecycleRegistration | null>(null);
    const panelUnregisterRef = useRef<(() => void) | null>(null);
    const [activeTab, setActiveTab] = useState<ComponentLabTabKey>('task');
    const [opened, setOpened] = useState(false);
    panelRegistrationRef.current ??= createPanelLifecycleRegistration();
    const panelRegistration = panelRegistrationRef.current;

    const registerPanelHandle = useCallback((handle: PanelLifecycleHandle | null): void => {
        panelUnregisterRef.current?.();
        panelUnregisterRef.current = handle === null ? null : panelRegistration.register(handle);
    }, [panelRegistration]);

    const focusGuard = useCallback((event: FocusEvent): void => {
        if (dialogRef.current !== null) keepFocusInsideDialog(event, dialogRef.current);
    }, []);

    const close = useCallback((restoreFocus = true): void => {
        const opener = openerRef.current;
        panelRegistration.deactivateActivePanel();
        setOpened(false);
        setActiveTab('task');
        document.removeEventListener('focusin', focusGuard, true);
        if (dialogRef.current?.open) dialogRef.current.close();
        onExpandedChange(false);
        openerRef.current = null;
        if (restoreFocus) restoreDialogOpener(opener);
    }, [focusGuard, onExpandedChange, panelRegistration]);

    useImperativeHandle(ref, () => ({
        open(source) {
            openerRef.current = source;
            setOpened(true);
            setActiveTab('task');
            dialogRef.current?.showModal();
            document.addEventListener('focusin', focusGuard, true);
            onExpandedChange(true);
            queueMicrotask(() => document.getElementById(`ft-${nickname}-tab-task`)?.focus());
        },
        close,
    }), [close, focusGuard, nickname, onExpandedChange]);

    useEffect(() => registerRootLifecycle({ deactivate: panelRegistration.deactivateActivePanel }), [panelRegistration, registerRootLifecycle]);
    useEffect(() => () => close(false), [close]);

    function selectTab(tab: ComponentLabTabKey, focus = true): void {
        if (tab === activeTab) return;
        panelRegistration.deactivateActivePanel();
        setActiveTab(tab);
        if (focus) queueMicrotask(() => {
            const nextTab = document.getElementById(`ft-${nickname}-tab-${tab}`);
            if (nextTab !== null) focusAndScrollComponentLabTab(nextTab);
        });
    }

    function onTabKey(event: React.KeyboardEvent): void {
        const nextTab = getComponentLabTabForKey(activeTab, event.key);
        if (nextTab === null) return;
        event.preventDefault();
        selectTab(nextTab);
    }

    function renderPanel(): React.ReactNode {
        const panelProps = {
            id: `ft-${nickname}-panel-${activeTab}`,
            role: 'tabpanel',
            'aria-labelledby': `ft-${nickname}-tab-${activeTab}`,
            'aria-describedby': `ft-${nickname}-${activeTab}-description`,
        } as const;
        switch (activeTab) {
            case 'task': return <div {...panelProps}><TaskWorkbench nickname={nickname} /></div>;
            case 'render': return <div {...panelProps}><RenderLab ref={registerPanelHandle} nickname={nickname} dependencies={dependencies} /></div>;
            case 'page-bridge': return <div {...panelProps}><PageBridgeLab ref={registerPanelHandle} nickname={nickname} environment={pageBridgeEnvironment} /></div>;
            case 'composition': return <div {...panelProps}><CompositionLab nickname={nickname} /></div>;
            case 'lifecycle': return <div {...panelProps}><LifecycleLab ref={registerPanelHandle} nickname={nickname} dependencies={lifecycleDependencies} /></div>;
        }
    }

    return (
        <dialog
            ref={dialogRef}
            className='ft-showcase-dialog'
            aria-labelledby={`ft-${nickname}-dialog-title`}
            tabIndex={-1}
            data-ft-role='dialog'
            onCancel={event => { event.preventDefault(); close(); }}
            onClick={event => { if (event.target === event.currentTarget) close(); }}
            onKeyDown={event => { if (dialogRef.current !== null) handleDialogTab(event.nativeEvent, dialogRef.current); }}
        >
            <div className='ft-showcase-header'>
                <h2 id={`ft-${nickname}-dialog-title`}>Component lab</h2>
                <button className='ft-showcase-button' type='button' aria-label='Close component lab' onClick={() => close()}>Close</button>
            </div>
            <div className='ft-showcase-tabs' role='tablist' tabIndex={-1} aria-label='Component lab sections' onKeyDown={onTabKey}>
                {COMPONENT_LAB_TABS.map(tab => <button key={tab.key} id={`ft-${nickname}-tab-${tab.key}`} className='ft-showcase-tab' data-ft-role={`tab-${tab.key}`} role='tab' type='button' aria-selected={activeTab === tab.key} aria-controls={`ft-${nickname}-panel-${tab.key}`} tabIndex={activeTab === tab.key ? 0 : -1} onClick={() => selectTab(tab.key, false)}>{tab.label}</button>)}
            </div>
            {opened && renderPanel()}
        </dialog>
    );
});

export default Modal;
