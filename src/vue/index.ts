import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { isNativeModalDialogSupported } from '../common/components/dialog';
import { browserRenderLabDependencies } from '../common/components/benchmark';
import type { FrameworkMountHandle, FrameworkMountOptions } from '../common/components/frameworkMount';
import App from './App.vue';

function getNickname(target: HTMLElement): string {
    if (!target.id.endsWith('App')) throw new Error('Framework target ID must end with App.');
    const nickname = target.id.slice(0, -3);
    if (!/^[a-z][a-z0-9-]*$/.test(nickname)) throw new Error('Framework target nickname is invalid.');
    return nickname;
}

export function createVue(target: HTMLElement, options: FrameworkMountOptions = {}): FrameworkMountHandle {
    if (!isNativeModalDialogSupported()) throw new Error('Native modal dialog is not supported.');
    const app = createApp(App, { nickname: getNickname(target), dependencies: options.dependencies ?? browserRenderLabDependencies });
    app.use(createPinia());
    app.mount(target);
    let mounted = true;
    return {
        unmount() {
            if (!mounted) return;
            mounted = false;
            app.unmount();
        },
    };
}
