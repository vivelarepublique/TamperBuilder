<script lang="ts">
    import svelteLogo from '../assets/svg/svelte.svg';
    import Modal from './components/Modal.svelte';

    let focus = $state(false);
    import { show, open } from './store/showStore';
</script>

<main>
    <button id="framework-test-svelte-modal" class="button framework-test-modal-switch" on:click={() => open()} on:mouseenter={() => focus = true} on:mouseleave={() => focus = false}>
        {#if focus}
            <span>More</span>
        {/if}
        <img src={svelteLogo} class="ft-button-logo" alt="Svelte logo" />
    </button>
    {#if $show}
        <Modal msg={'Welcome Svelte'} />
    {/if}
</main>

<style>
    #framework-test-svelte-modal {
        top: 50%;
        background-color: var(--ft-border-color-svelte);
    }
</style>
