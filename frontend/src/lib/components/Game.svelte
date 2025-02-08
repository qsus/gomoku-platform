<div class="component">
	<p>Game id: {gameId}</p>
	
	{#if gameState}
		<p>
			Players: {gameState.players}
			<button on:click={() => joinGame()}>Join</button>
		</p>
		<div id="game">
			<table>
				<thead>
					<tr>
						<th></th>
						{#each Array(gameState.board.length).fill(0).map((_, i) => String.fromCharCode(65 + i)) as x}
							<th>{x}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#if gameState}
						{#each gameState.board as row, y}
							<tr>
								<th>{y + 1}</th>
								{#each row as cell, x}
									<td on:click={() => positionClick(x, y)}>
										{#if cell === 1}
											<img src="/icons/default/one.png" alt="black stone">
										{:else if cell === 2}
											<img src="/icons/default/two.png" alt="white stone">
										{:else}
											{cell}
										{/if}
									</td>
								{/each}
							</tr>
						{/each}
					{:else}
						<tr>
							<td>Loading game state...</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{:else}
		<p>Loading game state...</p>
	{/if}
</div>



<style>
	#game table {
		border-collapse: collapse;
	}

	#game td {
		border: 1px solid black;
		width: 2em;
		height: 2em;
		margin: 0;
		padding: 0;
	}

	#game td img {
		width: 100%;
	}
</style>

<script lang="ts">
	import { page } from '$app/stores';
	import type { GameStatusBroadcast } from '$lib/Transport/GameStatusBroadcast';
	import type { Status } from '$lib/Transport/Status';
	import { onMount } from 'svelte';
	
	// constants
	export let socket: SocketIOClient.Socket;
	export let gameId: string;

	// game status
	let gameState: GameStatusBroadcast;

	function positionClick(x: number, y: number) {
		// for now assume playing simple moves
		let move = {
			stones: [{ x: x, y: y, color: 1 }],
			pressClock: true
		};
		socket.emit('playMove', { gameId: $page.params.gameId, move: move }, (status: Status) => {
			if (!status.success) {
				alert(status.message);
			}
		})

	}

	function joinGame() {
		socket.emit('joinGame', { gameId: $page.params.gameId }, (status: Status) => {
			if (!status.success) {
				alert(status.message);
			}
		});
	}

	onMount(() => {
		socket.on('gameStatus', (state: GameStatusBroadcast) => {
			gameState = state;
			console.log(gameState);
		});

		socket.emit('listenGame', { gameId: $page.params.gameId }, (status: Status) => {
			if (!status.success) {
				alert(status.message);
			}
		});
	});
</script>
