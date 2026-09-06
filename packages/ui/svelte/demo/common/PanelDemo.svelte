<script lang="ts">
	import type { Snippet } from 'svelte'

	const { title, info, children }: { title?: string; info?: string; children: Snippet } = $props()
</script>

<div class="panel-demo">
	{#if title}
		<h3 class="panel-demo__title">{title}</h3>
	{/if}
	<div class="panel-demo__content">{@render children()}</div>
	{#if info}
		<div class="panel-demo__info">{info}</div>
	{/if}
</div>
