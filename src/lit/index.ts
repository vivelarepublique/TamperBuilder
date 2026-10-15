import { browserRenderLabDependencies } from '../common/components/benchmark';
import { createPanelLifecycleRegistration, isNativeModalDialogSupported } from '../common/components/dialog';
import type { FrameworkMountHandle, FrameworkMountOptions } from '../common/components/frameworkMount';
import { browserLifecycleLabDependencies } from '../common/components/lifecycle';
import { createBrowserPageBridgeEnvironment } from '../common/components/pageBridge';
import { LitApp } from './lit-app';

function getNickname(target: HTMLElement): string {
    if (!target.id.endsWith('App')) throw new Error('Framework target ID must end with App.');
    const nickname = target.id.slice(0, -3);
    if (!/^[a-z][a-z0-9-]*$/.test(nickname)) throw new Error('Framework target nickname is invalid.');
    return nickname;
}

export function createLit(target: HTMLElement, options: FrameworkMountOptions = {}): FrameworkMountHandle {
    if (!isNativeModalDialogSupported()) throw new Error('Native modal dialog is not supported.');
    const rootLifecycle = createPanelLifecycleRegistration();
    const app = new LitApp();
    app.nickname = getNickname(target);
    app.dependencies = options.dependencies ?? browserRenderLabDependencies;
    app.pageBridgeEnvironment = options.pageBridgeEnvironment ?? createBrowserPageBridgeEnvironment();
    app.lifecycleDependencies = options.lifecycleDependencies ?? browserLifecycleLabDependencies;
    app.registerRootLifecycle = rootLifecycle.register;
    target.appendChild(app);
    let unmountPromise: Promise<void> | null = null;
    return {
        unmount() {
            if (unmountPromise !== null) return unmountPromise;
            rootLifecycle.deactivateActivePanel();
            unmountPromise = Promise.resolve().then(() => { app.remove(); });
            return unmountPromise;
        },
    };
}
