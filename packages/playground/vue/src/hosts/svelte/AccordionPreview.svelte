<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { Accordion } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'
	import { getParts } from './events'

	const bind: TPreviewProps = $props()
	const parts = getParts()
</script>

<Accordion {...bind}>
	{#each COLLECTION_ITEMS as item (item.value)}
		<Accordion.Item {...item} {...parts.Item}>
			<div style="padding: 4px 0">Содержимое «{item.text}»</div>
		</Accordion.Item>
	{/each}
</Accordion>
