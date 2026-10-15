import './assets/css/global.css';

import './assets/css/index.less';
import './assets/css/index.sass';
import './assets/css/index.stylus';

import { createVue } from './vue';
import { createReact } from './react';
import { createPreact } from './preact';
import { createLit } from './lit';
import { createSvelte } from './svelte';
import { createSolid } from './solid';

import { beforeMountEvent, afterMountEvent } from './lifecycle/mountEvent';
import { createDivAppElement, getMultiDivAppElement } from './common/utils/elementAdvanced';
import { startMain } from './main';

createDivAppElement(['vue', 'react', 'preact', 'lit', 'svelte', 'solid']);
const [vue, react, preact, lit, svelte, solid] = getMultiDivAppElement(['vue', 'react', 'preact', 'lit', 'svelte', 'solid']);

void startMain(
    {
        beforeMount: beforeMountEvent,
        mounts: [
            () => void createVue(vue),
            () => void createReact(react),
            () => void createPreact(preact),
            () => void createLit(lit),
            () => void createSvelte(svelte),
            () => void createSolid(solid),
        ],
        afterMount: afterMountEvent,
    },
    error => console.error('TamperBuilder failed to initialize.', error),
);
