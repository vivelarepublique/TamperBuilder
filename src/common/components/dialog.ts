export type ComponentLabTabKey = 'task' | 'render' | 'page-bridge' | 'composition' | 'lifecycle';

export interface ComponentLabTab {
    readonly key: ComponentLabTabKey;
    readonly label: string;
}

export const COMPONENT_LAB_TABS: readonly Readonly<ComponentLabTab>[] = Object.freeze([
    Object.freeze({ key: 'task', label: 'Task' }),
    Object.freeze({ key: 'render', label: 'Render' }),
    Object.freeze({ key: 'page-bridge', label: 'Page Bridge' }),
    Object.freeze({ key: 'composition', label: 'Composition' }),
    Object.freeze({ key: 'lifecycle', label: 'Lifecycle' }),
]);

export function getComponentLabTabForKey(current: ComponentLabTabKey, key: string): ComponentLabTabKey | null {
    if (key === 'Home') return COMPONENT_LAB_TABS[0]?.key ?? null;
    if (key === 'End') return COMPONENT_LAB_TABS.at(-1)?.key ?? null;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return null;
    const currentIndex = COMPONENT_LAB_TABS.findIndex(tab => tab.key === current);
    if (currentIndex < 0) return null;
    const offset = key === 'ArrowLeft' ? -1 : 1;
    return COMPONENT_LAB_TABS[(currentIndex + offset + COMPONENT_LAB_TABS.length) % COMPONENT_LAB_TABS.length]?.key ?? null;
}

export function focusAndScrollComponentLabTab(tab: HTMLElement): void {
    tab.focus();
    if (typeof tab.scrollIntoView === 'function') tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export interface PanelLifecycleHandle {
    deactivate(): void;
}

export interface PanelLifecycleRegistration {
    readonly register: (handle: PanelLifecycleHandle) => () => void;
    readonly deactivateActivePanel: () => void;
}

export function createPanelLifecycleRegistration(): PanelLifecycleRegistration {
    let active: PanelLifecycleHandle | null = null;

    return {
        register(handle) {
            let deactivated = false;
            const registeredHandle: PanelLifecycleHandle = {
                deactivate() {
                    if (deactivated) return;
                    deactivated = true;
                    try {
                        handle.deactivate();
                    } catch {
                        // Panel cleanup is an isolation boundary and must never break the shell.
                    }
                },
            };
            active = registeredHandle;
            let unregistered = false;
            return () => {
                if (unregistered) return;
                unregistered = true;
                if (active === registeredHandle) active = null;
            };
        },
        deactivateActivePanel() {
            active?.deactivate();
        },
    };
}

const focusableSelector = [
    'a[href]',
    'area[href]',
    'button',
    'input',
    'select',
    'textarea',
    'iframe',
    'object',
    'embed',
    'audio[controls]',
    'video[controls]',
    'summary',
    '[contenteditable]',
    '[tabindex]',
].join(',');

function isDisabled(element: HTMLElement): boolean {
    return 'disabled' in element && Boolean((element as HTMLButtonElement).disabled);
}

function hasDisabledFieldset(element: HTMLElement, boundary: HTMLElement): boolean {
    let parent = element.parentElement;
    while (parent !== null && parent !== boundary) {
        if (parent instanceof HTMLFieldSetElement && parent.disabled) return true;
        parent = parent.parentElement;
    }
    return false;
}

function isTreeVisible(element: HTMLElement, boundary: HTMLElement): boolean {
    let current: HTMLElement | null = element;
    while (current !== null) {
        if (current.hidden || current.hasAttribute('inert')) return false;
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (current === boundary) return true;
        current = current.parentElement;
    }
    return false;
}

export function getFocusableElements(dialog: HTMLDialogElement): HTMLElement[] {
    const candidates = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        element => element.isConnected && element.tabIndex >= 0 && !isDisabled(element) && !hasDisabledFieldset(element, dialog) && isTreeVisible(element, dialog),
    );
    const selectedRadios = new Map<string, HTMLInputElement>();
    for (const candidate of candidates) {
        if (!(candidate instanceof HTMLInputElement) || candidate.type !== 'radio' || candidate.name === '') continue;
        const existing = selectedRadios.get(candidate.name);
        if (existing === undefined || candidate.checked) selectedRadios.set(candidate.name, candidate);
    }
    return candidates.filter(candidate => {
        if (!(candidate instanceof HTMLInputElement) || candidate.type !== 'radio' || candidate.name === '') return true;
        return selectedRadios.get(candidate.name) === candidate;
    });
}

export function focusDialogFallback(dialog: HTMLDialogElement): void {
    (getFocusableElements(dialog)[0] ?? dialog).focus();
}

export function keepFocusInsideDialog(event: FocusEvent, dialog: HTMLDialogElement): void {
    if (dialog.open && event.target instanceof Node && !dialog.contains(event.target)) focusDialogFallback(dialog);
}

export function handleDialogTab(event: KeyboardEvent, dialog: HTMLDialogElement): void {
    if (event.key !== 'Tab') return;
    const candidates = getFocusableElements(dialog);
    if (candidates.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
    }
    const first = candidates[0];
    const last = candidates[candidates.length - 1];
    if ((!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
    }
}

export function isNativeModalDialogSupported(): boolean {
    return typeof HTMLDialogElement !== 'undefined' && typeof HTMLDialogElement.prototype.showModal === 'function' && typeof HTMLDialogElement.prototype.close === 'function';
}

export function restoreDialogOpener(opener: HTMLElement | null): void {
    if (opener?.isConnected && !isDisabled(opener)) opener.focus();
}
