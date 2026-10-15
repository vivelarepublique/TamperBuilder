import { afterEach, beforeEach } from 'vitest';
import { getFocusableElements } from '../../src/common/components/dialog';

let restore: (() => void) | undefined;

export function installNativeDialogShim(): () => void {
    const showModalDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
    const closeDescriptor = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
    let currentModal: HTMLDialogElement | null = null;

    const redirectFocus = () => {
        if (currentModal === null) return;
        (getFocusableElements(currentModal)[0] ?? currentModal).focus();
    };
    const isolate = (event: Event) => {
        if (currentModal === null || !(event.target instanceof Node) || currentModal.contains(event.target)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        redirectFocus();
    };

    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
        configurable: true,
        value(this: HTMLDialogElement) {
            if (this.open) throw new DOMException('The dialog is already open.', 'InvalidStateError');
            this.setAttribute('open', '');
            // The shim tracks the receiver as the active top-layer dialog.
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            currentModal = this;
        },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
        configurable: true,
        value(this: HTMLDialogElement) {
            this.removeAttribute('open');
            if (currentModal === this) currentModal = null;
        },
    });
    document.addEventListener('pointerdown', isolate, true);
    document.addEventListener('click', isolate, true);
    document.addEventListener('focusin', isolate, true);

    return () => {
        document.removeEventListener('pointerdown', isolate, true);
        document.removeEventListener('click', isolate, true);
        document.removeEventListener('focusin', isolate, true);
        if (showModalDescriptor === undefined) delete HTMLDialogElement.prototype.showModal;
        else Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalDescriptor);
        if (closeDescriptor === undefined) delete HTMLDialogElement.prototype.close;
        else Object.defineProperty(HTMLDialogElement.prototype, 'close', closeDescriptor);
        currentModal = null;
    };
}

beforeEach(() => {
    if (typeof HTMLDialogElement !== 'undefined') restore = installNativeDialogShim();
});

afterEach(() => {
    restore?.();
    restore = undefined;
});
