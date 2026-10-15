import { createSignal } from 'solid-js';
import type { JSX } from 'solid-js';

import VectorImage from './VectorImage';
import Counter from './Counter';
import WindowEvent from './WindowEvent';
import Benchmark from './Benchmark';

import { close } from '../signal/showSignal';

const componentsMap: Record<string, () => JSX.Element> = {
    VectorImage,
    Counter,
    WindowEvent,
    Benchmark,
};

interface Props {
    msg: string;
}

export default function Modal(props: Props) {
    const [currentView, setCurrentView] = createSignal<string>('VectorImage');

    function _close(event: Event) {
        event.stopPropagation();
        if (event.target === event.currentTarget) {
            close();
        }
    }

    return (
        <div class='framework-test-modal-mask' onClick={_close}>
            <div class='framework-test-modal-container'>
                <span>
                    <button class='framework-test-modal-close-button' onClick={close}>
                        &times;
                    </button>
                </span>
                <div class='block'>
                    <div class='title is-1 header-framework-test-solid'>{props.msg}</div>

                    <div class='tabs is-centered is-toggle is-toggle-rounded'>
                        <ul>
                            <li>
                                <button class={currentView() === 'VectorImage' ? 'button button-framework-test-solid' : 'button'} onClick={() => setCurrentView('VectorImage')}>
                                    Vector Image
                                </button>
                            </li>
                            <li>
                                <button class={currentView() === 'Counter' ? 'button button-framework-test-solid' : 'button'} onClick={() => setCurrentView('Counter')}>
                                    Counter
                                </button>
                            </li>
                            <li>
                                <button class={currentView() === 'WindowEvent' ? 'button button-framework-test-solid' : 'button'} onClick={() => setCurrentView('WindowEvent')}>
                                    Window Event
                                </button>
                            </li>
                            <li>
                                <button class={currentView() === 'Benchmark' ? 'button button-framework-test-solid' : 'button'} onClick={() => setCurrentView('Benchmark')}>
                                    Benchmark
                                </button>
                            </li>
                        </ul>
                    </div>
                    {componentsMap[currentView()]()}
                </div>
            </div>
        </div>
    );
}
