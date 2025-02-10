<div class="component">
	<fieldset>
		<legend>Login status</legend>
		<span>{#if $userData}Logged in as: {$userData.displayName}{:else}Not logged in{/if}</span>
	</fieldset>
	<form on:submit|preventDefault={() => {
		if (!$socket) {
			alert('Socket not connected');
			return;
		}
		$socket.emit('login', { displayName: displayName, password: password}, (status: Status, data: any) => {
			if (!status.success) {
				alert(status.message);
				return;
			}
			
			$userData = data;
		});
	}}>
		<fieldset>
			<legend>Login</legend>
			<input placeholder="displayName" bind:value={displayName}>
			<input placeholder="password" bind:value={password}>
			<button>Login</button>
			<span>Logged in as: {$userData ? $userData.displayName : ''}</span>
		</fieldset>
	</form>
	<form on:submit|preventDefault={() => {
		if (!$socket) {
			alert('Socket not connected');
			return;
		}
		$socket.emit('register', { displayName: displayName, email: email, password: password}, (status: Status, data: any) => {
			if (!status.success) {
				alert(status.message);
				return;
			}
			
			$userData = data;
		});
	}}>
		<fieldset>
			<legend>Register</legend>
			<input placeholder="displayName" bind:value={displayName}>
			<input placeholder="password" bind:value={password}>
			<input type="email" placeholder="email" bind:value={email}>
			<button>Register</button>
			<span>Logged in as: {$userData ? $userData.displayName : ''}</span>
		</fieldset>
	</form>
</div>

<script lang="ts">
	import type { Status } from '$lib/Transport/Status';
	import { onMount } from 'svelte';
	import { userData } from '$lib/stores/userData';
	import type { Writable } from 'svelte/store';
	import { getSocket } from '$lib/stores/socket';

	export let socket: Writable<SocketIOClient.Socket | null>;
	let displayName: string = '';
	let password: string = '';
	let email: string = '';

	let currentSocket: SocketIOClient.Socket | null = null;
	$: {
		if ($socket && $socket !== currentSocket) {
			currentSocket = $socket;
			
			$socket.on('userData', (userDataRcv: any) => {
				$userData = userDataRcv;
			});
		}
	}
	onMount(() => {
		getSocket();
	})
</script>


