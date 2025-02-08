{#if socket}
	<LoginForm socket={socket} />
  <Game gameId={$page.params.gameId} socket={socket} />
{/if}

<script lang="ts">
	import { page } from '$app/stores';
	import type { GameState } from '$lib/Transport/GameState';
	import { onMount } from 'svelte';
    import { getSocket } from '$lib/stores/socket';
    import Game from '$lib/components/Game.svelte';
    import LoginForm from '$lib/components/LoginForm.svelte';

	let socket: SocketIOClient.Socket;
	let gameState: GameState | null = null;

	onMount(() => {
		socket = getSocket();
	});
</script>

