<div class="component">
	<p>Game id: {gameId}</p>
	
	<div id="game">
		<h2>Players</h2>
		<ul>
			{#each players as player}
				<li>{player}</li>
			{/each}
		</ul>
		<table>
			<thead>
				<tr>
					<th></th>
					{#each Array(board.length).fill(0).map((_, i) => String.fromCharCode(65 + i)) as x}
						<th>{x}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if board}
					{#each board as row, y}
						<tr>
							<th>{y + 1}</th>
							{#each row as cell, x}
								<td on:click={() => playMove(x, y)}>
									{#if cell === "b"}
										<img src="/icons/default/one.png" alt="black stone">
									{:else if cell === "w"}
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

	<form on:submit|preventDefault>
		<input type="number" min="0" max="14" bind:value={xInput}>
		<input type="number" min="0" max="14" bind:value={yInput}>
		<button type="submit" on:click={() => playMove(xInput, yInput)}>Play</button>
	</form>

	<script>
		let xInput = 0;
		let yInput = 0;
	</script>
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
    import { isGameStatus, type GameStatus } from '$lib/Transport/GameStatus';
    //import { MoveType, type Move } from '$lib/Transport/Move';
    import type { Status } from '$lib/Transport/Status';
	import { onMount } from 'svelte';
	
	export let socket: SocketIOClient.Socket;
	export let gameId: string;
	let gameStatus: GameStatus; // This is incorrect
	let xInput: number;
	let yInput: number;

	let board: string[][];
	let players: string[];
	
	function playMove(x: number, y: number) {
		/*let move: Move = {
			moveType: MoveType.PlaceStone,
			stoneChanges: [
				{ x: x, y: y, color: "b" }
			]
		}
		socket.emit('playMove', $page.params.gameId, move, (status: Status) => {
			if (!status.success) {
				alert(status.message);
				return;
			}
		});*/
	}

	onMount(() => {
		console.log('Game component mounted');
		socket.on('gameStatus', (data: any) => {
			if (!isGameStatus(data)) {
				console.error('Invalid game status data', data);
				return;
			}
			
			if (data.gameId !== $page.params.gameId) return;
			
			board = data.board;
			players = data.players;
		});

		socket.emit('listenGame', { gameId: $page.params.gameId }, (status: Status) => {
			if (!status.success) {
				alert(status.message);
			}
		});
	});
</script>

