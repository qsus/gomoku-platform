{#if socket}
	<LoginForm socket={socket} />
	<Game gameId={$page.params.gameId} socket={socket} />
{:else}
	<p>Connecting...</p>
{/if}

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
    import { socketStore as socket } from '$lib/stores/socket';
    import Game from '$lib/components/Game.svelte';
    import LoginForm from '$lib/components/LoginForm.svelte';

	onMount(() => {

	});
</script>


