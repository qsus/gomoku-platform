<LoginForm socket={socket} />
<Game gameId={$page.params.gameId} socket={socket} />

<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { requireSocket, socket } from '$lib/stores/socket';
	import Game from '$lib/components/Game.svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';

	onMount(() => {
		requireSocket();
	});
</script>


