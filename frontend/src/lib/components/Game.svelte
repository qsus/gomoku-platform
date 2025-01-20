<div class="component">
	<p>Game id: {gameId}</p>
	
	<div id="game">
		<table>
			<thead>
				<tr>
					<th></th>
					{#each Array(gameState?.board.stones.length).fill(0).map((_, i) => String.fromCharCode(65 + i)) as x}
						<th>{x}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if gameState}
					{#each gameState.board.stones as row, y}
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
    import type { GameState } from '$lib/Transport/GameState';
    import { Color } from '$lib/Transport/Misc';
    import { MoveType, type Move } from '$lib/Transport/Move';
    import type { Status } from '$lib/Transport/Status';
	import { onMount } from 'svelte';
	
	export let socket: SocketIOClient.Socket;
	export let gameId: string;
	let gameState: GameState;
	let xInput: number;
	let yInput: number;
	
	function playMove(x: number, y: number) {
		let move: Move = {
			moveType: MoveType.PlaceStone,
			stoneChanges: [
				{ x: x, y: y, color: Color.Black }
			]
		}
		socket.emit('playMove', $page.params.gameId, move, (status: Status) => {
			if (!status.success) {
				alert(status.message);
				return;
			}
		});
	}

	onMount(() => {
		socket.on('gameState', (state: GameState) => {
			gameState = state;
			console.log(state);
		});

		socket.emit('joinGame', $page.params.gameId, (status: Status) => {
			if (!status.success) {
				alert(status.message);
			}
		});
	});
</script>
