import './app.css';
import { createSignal } from 'solid-js';
import { Show } from 'solid-js';
import solidLogo from '../assets/svg/solid.svg';

import Modal from './components/Modal';

import { show, open } from './signal/showSignal';

function App() {
    const [focus, setFocus] = createSignal(false);

    return (
        <div>
            <button id='framework-test-solid-modal' class='button framework-test-modal-switch' onClick={open} onMouseEnter={() => setFocus(true)} onMouseLeave={() => setFocus(false)}>
                {focus() && <span>More</span>}
                <img src={solidLogo} class='ft-button-logo' alt='Solid logo' />
            </button>
            <Show when={show()}>
                <Modal msg='Welcome Solid' />
            </Show>
        </div>
    );
}

export default App;
