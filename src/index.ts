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
import { createDivAppElement, createAppElement, getMultiDivAppElement } from './common/utils/elementAdvanced';

createDivAppElement(['vue', 'react', 'preact', 'svelte', 'solid']);
createAppElement('lit');
const [vue, react, preact, svelte, solid] = getMultiDivAppElement(['vue', 'react', 'preact', 'svelte', 'solid']);

const begin = async () => await beforeMountEvent();
const finish = () => afterMountEvent();

begin();

createVue(vue);
createReact(react);
createPreact(preact);
createLit();
createSvelte(svelte);
createSolid(solid);

finish();
