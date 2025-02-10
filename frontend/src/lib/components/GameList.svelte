<div class="component">
	<p>Game list</p>
	<ul>
		{#each gameIds as id}
			<li><a href="/game/{id}">{id}</a></li>
		{/each}
	</ul>
	<button on:click={() => {
		if (!$socket) {
			alert('Socket not connected');
			return;
		}

		$socket.emit('createGame', { gameType: "gomoku" }, (status: Status, gameId?: string): void => {
			if (!status.success) {
				alert(status.message);
				return;
			}
	
			//goto(`/game/${gameId}`);
		});
	}}>Create game</button>
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { getSocket } from '$lib/stores/socket';
	import type { Status } from '$lib/Transport/Status';
	import { onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	export let socket: Writable<SocketIOClient.Socket | null>;
	let gameIds: string[] = [];

	$: {
		if ($socket) {
			$socket.emit('listenGameList', {}, (status: Status): void => {
				if (!status.success) {
					alert(status.message);
					return;
				}
			});
		
			$socket.on('gameList', (gameIdsRcv: string[]) => {
				gameIds = gameIdsRcv;
			});
		}
	}

	onMount(() => {
		getSocket();
	});
</script>
