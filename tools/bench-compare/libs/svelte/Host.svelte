<script lang="ts">
	import type { Component, Snippet } from 'svelte'

	/**
	 * The root of a page: `count` copies of the page inside the library's
	 * wrapper (`Root` of its setup), when the library has one.
	 */
	const {
		Root,
		Page,
		count,
	}: { Root?: Component<{ children: Snippet }>; Page: Component; count: number } = $props()
</script>

{#snippet copies()}
	{#each { length: count }, index (index)}
		<Page />
	{/each}
{/snippet}

{#if Root}
	<Root children={copies} />
{:else}
	{@render copies()}
{/if}
