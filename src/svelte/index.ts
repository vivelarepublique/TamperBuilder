import { mount } from 'svelte';
import App from './App.svelte';

import './index.css';

export function createSvelte(target: HTMLElement) {
    const app = mount(App, { target });
    return app;
}
