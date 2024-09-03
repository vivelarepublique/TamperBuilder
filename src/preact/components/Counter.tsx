import { Fragment } from 'preact';
import { useContext } from 'preact/hooks';

import '../css/counter.css';

import CounterContext from '../context/CounterContext';

export default function Counter() {
    const { count, increment, decrement } = useContext(CounterContext);
    return (
        <Fragment>
            <div>
                <h1>Counter</h1>
                <p>Count: {count}</p>
                <div className='framework-test-counter-row'>
                    <button className='framework-test-counter-button preact-counter-button' onClick={() => increment()}>
                        Increment
                    </button>
                    <button className='framework-test-counter-button preact-counter-button' onClick={() => decrement()}>
                        Decrement
                    </button>
                </div>
            </div>
        </Fragment>
    );
}
