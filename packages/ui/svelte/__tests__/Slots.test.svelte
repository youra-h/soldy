<script lang="ts">
	/** Тестовая обёртка: сниппеты объявляются только в .svelte-файле. */
	import { Button } from '@soldy/ui-svelte'

	let {
		text = '',
		withLeading = false,
		withTrailing = false,
		withChildren = false,
		withScoped = false,
	}: {
		text?: string
		withLeading?: boolean
		withTrailing?: boolean
		withChildren?: boolean
		withScoped?: boolean
	} = $props()
</script>

{#if withScoped}
	<Button {text}>
		{#snippet children(scope)}<b>{scope.text}!</b>{/snippet}
	</Button>
{:else if withChildren}
	<Button {text}>
		{#snippet children()}<b>Custom</b>{/snippet}
	</Button>
{:else}
	<Button {text}>
		{#snippet leading()}{#if withLeading}<i>L</i>{/if}{/snippet}
		{#snippet trailing()}{#if withTrailing}<i>T</i>{/if}{/snippet}
	</Button>
{/if}
