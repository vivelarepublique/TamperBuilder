import './app.css';

import { Fragment } from 'preact';
import { useState } from 'preact/hooks';

import preactLogo from '../assets/svg/preact.svg';

import Modal from './components/Modal';

import { show, open } from './signal/showSignal';

export function App() {
    const _show = show.value;
    const [focus, setFocus] = useState(false);

    return (
        <Fragment>
            <button id='framework-test-preact-modal' class='button framework-test-modal-switch' onClick={open} onMouseEnter={() => setFocus(true)} onMouseLeave={() => setFocus(false)}>
                {focus && <span>More</span>}
                <img src={preactLogo} class='ft-button-logo' alt='Preact logo' />
            </button>
            {_show && <Modal msg='Welcome Preact'></Modal>}
        </Fragment>
    );
}
