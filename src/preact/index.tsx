import { render } from 'preact';
import { browserRenderLabDependencies } from '../common/components/benchmark';
import { isNativeModalDialogSupported } from '../common/components/dialog';
import type { FrameworkMountHandle, FrameworkMountOptions } from '../common/components/frameworkMount';
import { App } from './App';

function getNickname(target: HTMLElement): string {
    if (!target.id.endsWith('App')) throw new Error('Framework target ID must end with App.');
    const nickname = target.id.slice(0, -3);
    if (!/^[a-z][a-z0-9-]*$/.test(nickname)) throw new Error('Framework target nickname is invalid.');
    return nickname;
}

export function createPreact(target: HTMLElement, options: FrameworkMountOptions = {}): FrameworkMountHandle {
    if (!isNativeModalDialogSupported()) throw new Error('Native modal dialog is not supported.');
    render(<App nickname={getNickname(target)} dependencies={options.dependencies ?? browserRenderLabDependencies} />, target);
    let mounted = true;
    return { unmount() { if (!mounted) return; mounted = false; render(null, target); } };
}
