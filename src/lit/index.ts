import { LitApp } from './lit-app';

import './index.css';

export function createLit(target: HTMLElement): void {
    target.appendChild(new LitApp());
}
