import React, { useState } from 'react';

import { useCounterStore } from '../store/counterStore';

export default function Counter() {
    const _count = useCounterStore(state => state.count);
    const _increment = useCounterStore(state => state.increment);
    const _decrement = useCounterStore(state => state.decrement);
    const _incrementByAmount = useCounterStore(state => state.incrementByAmount);
    const _doubleCount = useCounterStore(state => state.doubleCount);
    const _reset = useCounterStore(state => state.reset);
    const [amount, setAmount] = useState(0);
    return (
        <React.Fragment>
            <div className='block'>
                <div className='subtitle is-2 header-framework-test-react'>Counter, Count is {_count}</div>

                <div className='columns'>
                    <div className='column'>
                        <button className='button button-framework-test-react' onClick={_increment}>
                            Increment
                        </button>
                    </div>
                    <div className='column'>
                        <button className='button button-framework-test-react' onClick={_decrement}>
                            Decrement
                        </button>
                    </div>
                    <div className='column'>
                        <div className='field has-addons'>
                            <div className='control'>
                                <input type='number' className='input' placeholder='Amount' value={amount} onChange={e => setAmount(Number(e.target.value))} />
                            </div>
                            <div className='control'>
                                <button className='button button-framework-test-react' onClick={() => _incrementByAmount(amount)}>
                                    Increment By Amount
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className='column'>
                        <button className='button button-framework-test-react' onClick={_doubleCount}>
                            Double Count
                        </button>
                    </div>
                    <div className='column'>
                        <button className='button button-framework-test-react' onClick={_reset}>
                            Reset
                        </button>
                    </div>
                </div>
            </div>
        </React.Fragment>
    );
}
