<div class="component">
	<p>Game list</p>
	<ul>
		{#each gameIds as id}
			<li><a href="/game/{id}">{id}</a></li>
		{/each}
	</ul>
	<button on:click={() => {
		socket.emit('createGame', { gameType: "gomoku" }, (status: Status, gameId?: string): void => {
			if (!status.success) {
				alert(status.message);
				return;
			}
	
			goto(`/game/${gameId}`);
		});
	}}>Create game</button>
</div>

<script lang="ts">
    import { goto } from '$app/navigation';
    import type { Status } from '$lib/Transport/Status';
	import { onMount } from 'svelte';

	export let socket: SocketIOClient.Socket;
	let gameIds: string[] = [];

	onMount(() => {
		// TODO optional: ask for game list

		socket.on('gameList', (gameIdsRcv: string[]) => {
			gameIds = gameIdsRcv;
		});
	});
</script>
