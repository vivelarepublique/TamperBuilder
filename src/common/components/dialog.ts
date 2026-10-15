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
