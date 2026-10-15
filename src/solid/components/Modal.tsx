import { createMemo, createSignal, For, Match, onCleanup, onMount, Switch } from 'solid-js';
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

interface ModalProps {
    readonly nickname: string;
    readonly dependencies: RenderLabDependencies;
    readonly pageBridgeEnvironment: PageBridgeEnvironment;
    readonly lifecycleDependencies: LifecycleLabDependencies;
    readonly registerRootLifecycle: PanelLifecycleRegistration['register'];
    readonly opener: HTMLElement;
    readonly onClose: () => void;
}

export default function Modal(props: ModalProps) {
    // Nickname and injected dependencies are immutable for this mounted root.
    // eslint-disable-next-line solid/reactivity
    const nickname = props.nickname;
    const panelRegistration = createPanelLifecycleRegistration();
    const registerLifecycle = (handle: PanelLifecycleHandle) => panelRegistration.register(handle);
    const [activeTab, setActiveTab] = createSignal<ComponentLabTabKey>('task');
    const panelId = createMemo(() => `ft-${nickname}-panel-${activeTab()}`);
    let dialog!: HTMLDialogElement;

    function close(): void {
        panelRegistration.deactivateActivePanel();
        setActiveTab('task');
        props.onClose();
    }

    function selectTab(tab: ComponentLabTabKey, focus = true): void {
        if (activeTab() === tab) return;
        panelRegistration.deactivateActivePanel();
        setActiveTab(tab);
        if (focus) queueMicrotask(() => {
            const nextTab = document.getElementById(`ft-${nickname}-tab-${tab}`);
            if (nextTab !== null) focusAndScrollComponentLabTab(nextTab);
        });
    }

    function tabKey(event: KeyboardEvent): void {
        const nextTab = getComponentLabTabForKey(activeTab(), event.key);
        if (nextTab === null) return;
        event.preventDefault();
        selectTab(nextTab);
    }

    onMount(() => {
        const unregisterRoot = props.registerRootLifecycle({ deactivate: panelRegistration.deactivateActivePanel });
        const focusGuard = (event: FocusEvent) => keepFocusInsideDialog(event, dialog);
        dialog.showModal();
        document.addEventListener('focusin', focusGuard, true);
        queueMicrotask(() => document.getElementById(`ft-${nickname}-tab-task`)?.focus());
        onCleanup(() => {
            panelRegistration.deactivateActivePanel();
            unregisterRoot();
            document.removeEventListener('focusin', focusGuard, true);
            if (dialog.open) dialog.close();
            restoreDialogOpener(props.opener);
        });
    });

    return <dialog ref={dialog} class='ft-showcase-dialog' aria-labelledby={`ft-${nickname}-dialog-title`} tabIndex={-1} data-ft-role='dialog' onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => handleDialogTab(event, dialog)}>
        <div class='ft-showcase-header'><h2 id={`ft-${nickname}-dialog-title`}>Component lab</h2><button class='ft-showcase-button' type='button' aria-label='Close component lab' onClick={close}>Close</button></div>
        <div class='ft-showcase-tabs' role='tablist' tabIndex={-1} aria-label='Component lab sections' onKeyDown={tabKey}>
            <For each={COMPONENT_LAB_TABS}>{tab => <button id={`ft-${nickname}-tab-${tab.key}`} class='ft-showcase-tab' data-ft-role={`tab-${tab.key}`} role='tab' type='button' aria-selected={activeTab() === tab.key} aria-controls={`ft-${nickname}-panel-${tab.key}`} tabIndex={activeTab() === tab.key ? 0 : -1} onClick={() => selectTab(tab.key, false)}>{tab.label}</button>}</For>
        </div>
        <div id={panelId()} role='tabpanel' aria-labelledby={`ft-${nickname}-tab-${activeTab()}`} aria-describedby={`ft-${nickname}-${activeTab()}-description`}>
            <Switch>
                <Match when={activeTab() === 'task'}><TaskWorkbench nickname={nickname} /></Match>
                <Match when={activeTab() === 'render'}><RenderLab nickname={nickname} dependencies={props.dependencies} registerLifecycle={registerLifecycle} /></Match>
                <Match when={activeTab() === 'page-bridge'}><PageBridgeLab nickname={nickname} environment={props.pageBridgeEnvironment} registerLifecycle={registerLifecycle} /></Match>
                <Match when={activeTab() === 'composition'}><CompositionLab nickname={nickname} /></Match>
                <Match when={activeTab() === 'lifecycle'}><LifecycleLab nickname={nickname} dependencies={props.lifecycleDependencies} registerLifecycle={registerLifecycle} /></Match>
            </Switch>
        </div>
    </dialog>;
}
