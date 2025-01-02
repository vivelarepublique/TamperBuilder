<script lang="ts">
    import { count, increment, decrement, incrementByAmount, doubleCount, reset } from '../store/counterStore';
    let amount = $state(0);

    function handleAmountInput(event: Event) {
        const input = event.target as HTMLInputElement;
        amount = parseInt(input.value);
    }
</script>

<div class="block">
    <div class="subtitle is-2 header-framework-test-svelte">Counter, Count is {$count}</div>

    <div class="columns">
        <div class="column">
            <button class="button button-framework-test-svelte" onclick={increment}>Increment</button>
        </div>
        <div class="column">
            <button class="button button-framework-test-svelte" onclick={decrement}>Decrement</button>
        </div>
        <div class="column">
            <div class="field has-addons">
                <div class="control">
                    <input type="number" class="input" placeholder="Amount" bind:value={amount} oninput={handleAmountInput} />
                </div>
                <div class="control">
                    <button class="button button-framework-test-svelte" onclick={() => incrementByAmount(amount)}>Increment By Amount</button>
                </div>
            </div>
        </div>
        <div class="column">
            <button class="button button-framework-test-svelte" onclick={doubleCount}>Double Count</button>
        </div>
        <div class="column">
            <button class="button button-framework-test-svelte" onclick={reset}>Reset</button>
        </div>
    </div>
</div>
