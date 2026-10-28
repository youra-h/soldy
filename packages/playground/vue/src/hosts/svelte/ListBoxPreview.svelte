<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { ListBox } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'
	import { getParts } from './events'

	const bind: TPreviewProps = $props()
	const parts = getParts()
</script>

<!--
	Items in markup, unless they come as data (`items` from the page's groups
	block): markup would replace the data, and the list draws groups from data.
-->
{#if bind.items}
	<ListBox {...bind} />
{:else}
	<ListBox {...bind}>
		{#each COLLECTION_ITEMS as item (item.value)}
			<ListBox.Item {...item} {...parts.Item} />
		{/each}
	</ListBox>
{/if}
