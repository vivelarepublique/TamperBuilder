import { createSignal, Index } from 'solid-js';
import { divList, addRandomColorDiv, emptyRandomColorDiv } from '../signal/benchmarkSignal';

import { measureRenderTime } from '../../common/components/benchmark';

export default function Counter() {
    const [count, setCount] = createSignal(0);
    const [duration, setDuration] = createSignal(0);

    function _render() {
        measureRenderTime(addRandomColorDiv, count(), setDuration);
    }

    function handleNumberInput(event: Event) {
        const target = event.target as HTMLInputElement;
        setCount(parseInt(target.value));
    }
    return (
        <div class='block'>
            <div class='subtitle is-2 header-framework-test-solid'>Benchmark, Spend Time: {duration()} ms</div>

            <div class='field'>
                <label class='label'>Render Number</label>
                <div class='control'>
                    <input type='number' class='input' placeholder='Render Number' value={count()} onInput={handleNumberInput} />
                </div>
            </div>

            <div class='field is-grouped'>
                <div class='control'>
                    <button class='button is-large button-framework-test-solid' onClick={_render}>
                        Render
                    </button>
                </div>
                <div class='control'>
                    <button class='button is-large button-framework-test-solid' onClick={emptyRandomColorDiv}>
                        Empty
                    </button>
                </div>
            </div>

            <div class='columns is-multiline'>
                <Index each={divList()}>
                    {ds => (
                        <div class='column is-1' style={{ 'background-color': ds().backgroundColor, color: ds().color, 'font-size': '8px' }}>
                            Div# {ds().id}
                        </div>
                    )}
                </Index>
            </div>
        </div>
    );
}
