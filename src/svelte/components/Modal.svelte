<script lang="ts">
    import type { Component } from 'svelte';
    import VectorImage from './VectorImage.svelte';
    import Counter from './Counter.svelte';
    import WindowEvent from './WindowEvent.svelte';
    import Benchmark from './Benchmark.svelte';

    let Components: Component = $state(VectorImage);

    import { close } from '../store/showStore';

    let { msg } = $props();

    function _close(event: Event) {
        event.stopPropagation();
        if (event.target === event.currentTarget) {
            close();
        }
    }
</script>

<main>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="framework-test-modal-mask" onclick={_close}>
        <div class="framework-test-modal-container">
            <span><button class="framework-test-modal-close-button" onclick={close}>&times;</button></span>

            <div class="block">
                <div class="title is-1 header-framework-test-svelte">{msg}</div>
                <div class="tabs is-centered is-toggle is-toggle-rounded">
                    <ul>
                        <li>
                            <button class={Components === VectorImage ? 'button button-framework-test-svelte' : 'button'} onclick={() => (Components = VectorImage)}> Vector Image </button>
                        </li>
                        <li>
                            <button class={Components === Counter ? 'button button-framework-test-svelte' : 'button'} onclick={() => (Components = Counter)}> Counter </button>
                        </li>
                        <li>
                            <button class={Components === WindowEvent ? 'button button-framework-test-svelte' : 'button'} onclick={() => (Components = WindowEvent)}> Window Event </button>
                        </li>
                        <li>
                            <button class={Components === Benchmark ? 'button button-framework-test-svelte' : 'button'} onclick={() => (Components = Benchmark)}> Benchmark </button>
                        </li>
                    </ul>
                </div>

                <Components />
            </div>
        </div>
    </div>
</main>
