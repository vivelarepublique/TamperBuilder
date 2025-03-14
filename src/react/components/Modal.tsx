import React, { Fragment, useState, useCallback } from 'react';
import type { ComponentType } from 'react';

import VectorImage from './VectorImage';
import Counter from './Counter';
import WindowEvent from './WindowEvent';
import Benchmark from './Benchmark';

import { useShowStore } from '../store/showStore';

const componentsMap: Record<string, ComponentType> = {
    VectorImage,
    Counter,
    WindowEvent,
    Benchmark,
};

interface Props {
    msg: string;
}

export default function Modal(props: Props) {
    const [currentView, setCurrentView] = useState('VectorImage');
    const ComponentToRender = componentsMap[currentView];
    const { msg } = props;
    const close = useShowStore(state => state.close);

    const _close = useCallback((event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) {
            close();
        }
    }, []);
    return (
        <Fragment>
            <div className='framework-test-modal-mask' onClick={_close}>
                <div className='framework-test-modal-container'>
                    <span>
                        <button className='framework-test-modal-close-button' onClick={close}>
                            &times;
                        </button>
                    </span>

                    <div className='block'>
                        <div className='title is-1 header-framework-test-react'>{msg}</div>

                        <div className='tabs is-centered is-toggle is-toggle-rounded'>
                            <ul>
                                <li>
                                    <button className={currentView === 'VectorImage' ? 'button button-framework-test-react' : 'button'} onClick={() => setCurrentView('VectorImage')}>
                                        Vector Image
                                    </button>
                                </li>
                                <li>
                                    <button className={currentView === 'Counter' ? 'button button-framework-test-react' : 'button'} onClick={() => setCurrentView('Counter')}>
                                        Counter
                                    </button>
                                </li>
                                <li>
                                    <button className={currentView === 'WindowEvent' ? 'button button-framework-test-react' : 'button'} onClick={() => setCurrentView('WindowEvent')}>
                                        Window Event
                                    </button>
                                </li>
                                <li>
                                    <button className={currentView === 'Benchmark' ? 'button button-framework-test-react' : 'button'} onClick={() => setCurrentView('Benchmark')}>
                                        Benchmark
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <ComponentToRender />
                    </div>
                </div>
            </div>
        </Fragment>
    );
}
