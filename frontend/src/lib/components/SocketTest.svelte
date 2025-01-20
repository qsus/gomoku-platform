<div class="component">
	<button on:click={() => {
		// debugging command
		socket.emit("test", 4);
		//socket.emit('login', 44, 45, 46, ()=>{}) // attempt to crash server by not providing arguments
		//socket.emit('login') // attempt to crash server by not providing callback
		//socket.emit('unknownrandomevent') // attempt to crash server by not providing callback
	}}>Test</button>
</div>

<script lang="ts">
	import type { Status } from '$lib/Transport/Status';
	import { onMount } from 'svelte';

	export let socket: SocketIOClient.Socket;
	let displayName: string = '';
	let password: string = '';
	let userData: string = '';

	onMount(() => {
		socket.on('userData', (userDataRcv: string) => {
			userData = userDataRcv;
		});

		socket.on('alert', (message: any) => {
			alert(message);
			console.log(message);
		})
	})
</script>
