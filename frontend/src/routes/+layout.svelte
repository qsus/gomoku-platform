<script lang="ts">
	let { children } = $props();
</script>

<nav>
	<a href="/">home</a>
</nav>

{@render children()}

<style>
	:global(.component) {
		border: 1px solid black;
	}
</style>
