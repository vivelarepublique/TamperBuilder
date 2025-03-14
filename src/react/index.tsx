import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

import './index.css';

export function createReact(target: HTMLElement) {
    createRoot(target).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
