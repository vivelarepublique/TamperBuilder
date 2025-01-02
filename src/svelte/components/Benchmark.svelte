<script lang="ts">
    import { divList, addRandomColorDiv, emptyRandomColorDiv } from '../store/benchmarkStore';
    import { measureRenderTime } from '../../common/components/benchmark';
    let count = $state(0);
    let duration = $state(0);

    function handleNumberInput(event: Event) {
        const input = event.target as HTMLInputElement;
        count = parseInt(input.value);
    }

    function _updateDuration(time: number) {
        duration = time;
    }

    async function _render() {
        measureRenderTime(addRandomColorDiv, count, _updateDuration);
    }
</script>

<div class="block">
    <div class="subtitle is-2 header-framework-test-svelte">Benchmark, Spend Time: {duration} ms</div>

    <div class="field">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="label">Render Number</label>
        <div class="control">
            <input type="number" class="input" placeholder="Render Number" bind:value={count} oninput={handleNumberInput} />
        </div>
    </div>

    <div class="field is-grouped">
        <div class="control">
            <button class="button is-large button-framework-test-svelte" onclick={_render}>Render</button>
        </div>
        <div class="control">
            <button class="button is-large button-framework-test-svelte" onclick={emptyRandomColorDiv}>Empty</button>
        </div>
    </div>

    <div class="columns is-multiline">
        {#each $divList as ds (ds.id)}
            <div class="column is-1" style="background-color: {ds.backgroundColor}; color: {ds.color}; font-size: 8px;">Div# {ds.id}</div>
        {/each}
    </div>
</div>
