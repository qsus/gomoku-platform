<LoginForm socket={socket} />
<GameList socket={socket} />
<SocketTest socket={socket} />

<script lang="ts">
	import { onMount } from 'svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import GameList from '$lib/components/GameList.svelte';
	import { socket, requireSocket } from '$lib/stores/socket';
	import SocketTest from '$lib/components/SocketTest.svelte';
	
	onMount(() => {
		requireSocket();
	});
</script>
