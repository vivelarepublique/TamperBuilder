import { useEffect, useRef, useState } from 'preact/hooks';
import type { RenderLabDependencies } from '../../common/components/benchmark';
import { handleDialogTab, keepFocusInsideDialog, restoreDialogOpener } from '../../common/components/dialog';
import type { PreactModel } from '../signal/rootModel';
import RenderLab from './RenderLab';
import TaskWorkbench from './TaskWorkbench';

export default function Modal({ nickname, dependencies, model, opener }: { readonly nickname: string; readonly dependencies: RenderLabDependencies; readonly model: PreactModel; readonly opener: { current: HTMLButtonElement | null } }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [activeTab, setActiveTab] = useState<'task' | 'render'>('task');
    const open = model.open.value;

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

    function close(): void { setActiveTab('task'); model.closeLab(); }
    function selectTab(tab: 'task' | 'render', focus = true): void { setActiveTab(tab); if (focus) queueMicrotask(() => document.getElementById(`ft-${nickname}-tab-${tab}`)?.focus()); }
    function onTabKey(event: KeyboardEvent): void {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); selectTab(activeTab === 'task' ? 'render' : 'task'); }
        else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); selectTab(event.key === 'Home' ? 'task' : 'render'); }
    }

    return <dialog ref={dialogRef} class='ft-showcase-dialog' aria-labelledby={`ft-${nickname}-dialog-title`} tabIndex={-1} data-ft-role='dialog' onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (dialogRef.current) handleDialogTab(event, dialogRef.current); }}>
        <div class='ft-showcase-header'><h2 id={`ft-${nickname}-dialog-title`}>Component lab</h2><button class='ft-showcase-button' type='button' aria-label='Close component lab' onClick={close}>Close</button></div>
        <div class='ft-showcase-tabs' role='tablist' aria-label='Component lab sections' onKeyDown={onTabKey}>
            <button id={`ft-${nickname}-tab-task`} class='ft-showcase-tab' data-ft-role='tab-task' role='tab' type='button' aria-selected={activeTab === 'task'} aria-controls={`ft-${nickname}-panel-task`} tabIndex={activeTab === 'task' ? 0 : -1} onClick={() => selectTab('task', false)}>Task</button>
            <button id={`ft-${nickname}-tab-render`} class='ft-showcase-tab' data-ft-role='tab-render' role='tab' type='button' aria-selected={activeTab === 'render'} aria-controls={`ft-${nickname}-panel-render`} tabIndex={activeTab === 'render' ? 0 : -1} onClick={() => selectTab('render', false)}>Render</button>
        </div>
        {open && (activeTab === 'task' ? <div id={`ft-${nickname}-panel-task`} role='tabpanel' aria-labelledby={`ft-${nickname}-tab-task`} aria-describedby={`ft-${nickname}-task-description`}><TaskWorkbench nickname={nickname} model={model} /></div> : <div id={`ft-${nickname}-panel-render`} role='tabpanel' aria-labelledby={`ft-${nickname}-tab-render`} aria-describedby={`ft-${nickname}-render-description`}><RenderLab nickname={nickname} dependencies={dependencies} /></div>)}
    </dialog>;
}
