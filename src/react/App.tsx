import './app.css';

import React, { useState } from 'react';
import Modal from './components/Modal';

import reactLogo from '../assets/svg/react.svg';

import { useShowStore } from './store/showStore';

export default function App() {
    const [focus, setFocus] = useState(false);

    const _show = useShowStore(state => state.show);
    const _open = useShowStore(state => state.open);
    return (
        <React.Fragment>
            <button id='framework-test-react-modal' className='button framework-test-modal-switch' onClick={_open} onMouseEnter={() => setFocus(true)} onMouseLeave={() => setFocus(false)}>
                {focus && <span>More</span>}
                <img src={reactLogo} className='ft-button-logo' alt='React logo' />
            </button>
            {_show && <Modal msg='Welcome React'></Modal>}
        </React.Fragment>
    );
}
