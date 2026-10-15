// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
    focusDialogFallback,
    getFocusableElements,
    handleDialogTab,
    isNativeModalDialogSupported,
    keepFocusInsideDialog,
    restoreDialogOpener,
} from '../../src/common/components/dialog';

describe('native dialog DOM helpers', () => {
    it('filters candidates and keeps one usable radio per named group', () => {
        document.body.innerHTML = `<dialog open tabindex="-1">
            <button id="first">First</button>
            <button disabled>Disabled</button>
            <fieldset disabled><button>Fieldset</button></fieldset>
            <div hidden><button>Hidden</button></div>
            <div inert><button>Inert</button></div>
            <div style="display:none"><button>Display</button></div>
            <div style="visibility:hidden"><button>Visibility</button></div>
            <input type="radio" name="status" id="all">
            <input type="radio" name="status" id="done" checked>
            <a href="#target" tabindex="-1">Negative</a>
            <button id="last">Last</button>
        </dialog>`;
        const dialog = document.querySelector('dialog')!;
        expect(getFocusableElements(dialog).map(element => element.id)).toEqual(['first', 'done', 'last']);
    });

    it('uses the first unchecked radio and cycles focus at both boundaries', () => {
        document.body.innerHTML = '<dialog open tabindex="-1"><input id="one" type="radio" name="choice"><input id="two" type="radio" name="choice"><button id="last">Last</button></dialog>';
        const dialog = document.querySelector('dialog')!;
        const [first, last] = getFocusableElements(dialog);
        expect(first?.id).toBe('one');
        last?.focus();
        const forward = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        handleDialogTab(forward, dialog);
        expect(forward.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(first);
        const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
        handleDialogTab(backward, dialog);
        expect(document.activeElement).toBe(last);
    });

    it('recovers escaped focus and falls back to the dialog container', () => {
        document.body.innerHTML = '<button id="outside">Outside</button><dialog open tabindex="-1"><button id="inside">Inside</button></dialog>';
        const outside = document.querySelector<HTMLButtonElement>('#outside')!;
        const dialog = document.querySelector('dialog')!;
        document.addEventListener('focusin', event => keepFocusInsideDialog(event, dialog), { once: true });
        outside.focus();
        expect(document.activeElement?.id).toBe('inside');
        dialog.replaceChildren();
        focusDialogFallback(dialog);
        expect(document.activeElement).toBe(dialog);
    });

    it('isolates external focus and click while modal, then restores exact behavior after close', () => {
        document.body.innerHTML = '<button id="outside">Outside</button><dialog tabindex="-1"><button id="inside">Inside</button></dialog>';
        const outside = document.querySelector<HTMLButtonElement>('#outside')!;
        const dialog = document.querySelector('dialog')!;
        const clicked = vi.fn();
        outside.addEventListener('click', clicked);
        dialog.showModal();
        outside.focus();
        expect(document.activeElement?.id).toBe('inside');
        outside.click();
        expect(clicked).not.toHaveBeenCalled();
        expect(() => dialog.showModal()).toThrowError(expect.objectContaining({ name: 'InvalidStateError' }));
        dialog.close();
        outside.focus();
        outside.click();
        expect(document.activeElement).toBe(outside);
        expect(clicked).toHaveBeenCalledOnce();
        expect(outside.hasAttribute('inert')).toBe(false);
        expect(outside.hasAttribute('aria-hidden')).toBe(false);
        expect(isNativeModalDialogSupported()).toBe(true);
    });

    it('restores only a connected enabled opener', () => {
        document.body.innerHTML = '<button id="opener">Open</button><button id="other">Other</button>';
        const opener = document.querySelector<HTMLButtonElement>('#opener')!;
        const other = document.querySelector<HTMLButtonElement>('#other')!;
        other.focus();
        restoreDialogOpener(opener);
        expect(document.activeElement).toBe(opener);
        opener.disabled = true;
        other.focus();
        restoreDialogOpener(opener);
        expect(document.activeElement).toBe(other);
    });
});
