import React from 'react';

import Test from './Test';
import Counter from './Counter';
import Bridge from './Bridge';

import '../css/modal.css';

import { close } from '../store/switcher';
import { useDispatch } from 'react-redux';

export default function Modal() {
    const dispatch = useDispatch();
    return (
        <React.Fragment>
            <div
                className='modal-mask'
                onClick={event => {
                    event.stopPropagation();
                    if (event.target === event.currentTarget) {
                        dispatch(close());
                    }
                }}
            >
                <div className='modal-container'>
                    <span>
                        <button className='modal-close-button' onClick={() => dispatch(close())}>
                            &times;
                        </button>
                    </span>
                    <div className='b4-container'>
                        <div className='b4-row'>
                            <Test msg='Welcome React' />
                            <Counter />
                            <Bridge />
                        </div>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}