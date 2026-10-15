import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { RenderLabDependencies } from '../../common/components/benchmark';
import { handleDialogTab, keepFocusInsideDialog, restoreDialogOpener } from '../../common/components/dialog';
import RenderLab from './RenderLab';
import TaskWorkbench from './TaskWorkbench';

export interface ModalHandle {
    open(source: HTMLElement): void;
    close(restoreFocus?: boolean): void;
}

interface ModalProps {
    readonly nickname: string;
    readonly dependencies: RenderLabDependencies;
    readonly onExpandedChange: (expanded: boolean) => void;
}

const Modal = forwardRef<ModalHandle, ModalProps>(function Modal({ nickname, dependencies, onExpandedChange }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const openerRef = useRef<HTMLElement | null>(null);
    const [activeTab, setActiveTab] = useState<'task' | 'render'>('task');
    const [opened, setOpened] = useState(false);

    const focusGuard = useCallback((event: FocusEvent): void => {
        if (dialogRef.current !== null) keepFocusInsideDialog(event, dialogRef.current);
    }, []);

    const close = useCallback((restoreFocus = true): void => {
        const opener = openerRef.current;
        setOpened(false);
        setActiveTab('task');
        document.removeEventListener('focusin', focusGuard, true);
        if (dialogRef.current?.open) dialogRef.current.close();
        onExpandedChange(false);
        openerRef.current = null;
        if (restoreFocus) restoreDialogOpener(opener);
    }, [focusGuard, onExpandedChange]);

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

    useEffect(() => () => close(false), [close]);

    function selectTab(tab: 'task' | 'render', focus = true): void {
        setActiveTab(tab);
        if (focus) queueMicrotask(() => document.getElementById(`ft-${nickname}-tab-${tab}`)?.focus());
    }

    function onTabKey(event: React.KeyboardEvent): void {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            selectTab(activeTab === 'task' ? 'render' : 'task');
        } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            selectTab(event.key === 'Home' ? 'task' : 'render');
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
            <div className='ft-showcase-tabs' role='tablist' aria-label='Component lab sections' onKeyDown={onTabKey}>
                <button id={`ft-${nickname}-tab-task`} className='ft-showcase-tab' data-ft-role='tab-task' role='tab' type='button' aria-selected={activeTab === 'task'} aria-controls={`ft-${nickname}-panel-task`} tabIndex={activeTab === 'task' ? 0 : -1} onClick={() => selectTab('task', false)}>Task</button>
                <button id={`ft-${nickname}-tab-render`} className='ft-showcase-tab' data-ft-role='tab-render' role='tab' type='button' aria-selected={activeTab === 'render'} aria-controls={`ft-${nickname}-panel-render`} tabIndex={activeTab === 'render' ? 0 : -1} onClick={() => selectTab('render', false)}>Render</button>
            </div>
            {opened && (activeTab === 'task' ? (
                <div id={`ft-${nickname}-panel-task`} role='tabpanel' aria-labelledby={`ft-${nickname}-tab-task`} aria-describedby={`ft-${nickname}-task-description`}>
                    <TaskWorkbench nickname={nickname} />
                </div>
            ) : (
                <div id={`ft-${nickname}-panel-render`} role='tabpanel' aria-labelledby={`ft-${nickname}-tab-render`} aria-describedby={`ft-${nickname}-render-description`}>
                    <RenderLab nickname={nickname} dependencies={dependencies} />
                </div>
            ))}
        </dialog>
    );
});

export default Modal;
