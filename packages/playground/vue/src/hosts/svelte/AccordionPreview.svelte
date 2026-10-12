<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { Accordion } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<Accordion {...bind}>
	{#each COLLECTION_ITEMS as item (item.value)}
		<Accordion.Item {...item}>
			<div style="padding: 4px 0">Содержимое «{item.text}»</div>
		</Accordion.Item>
	{/each}
</Accordion>
