{#if socket}
  <LoginForm socket={socket} />
  <GameList socket={socket} />
  <SocketTest socket={socket} />
{/if}

<script lang="ts">
	import { onMount } from 'svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import GameList from '$lib/components/GameList.svelte';
	import { getSocket } from '$lib/stores/socket';
	import SocketTest from '$lib/components/SocketTest.svelte';

	let socket: SocketIOClient.Socket;
	
	onMount(() => {
		socket = getSocket();
	});
</script>
