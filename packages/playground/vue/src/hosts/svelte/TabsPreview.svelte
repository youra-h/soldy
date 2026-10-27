<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { Tabs } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'
	import { getParts } from './events'

	const bind: TPreviewProps = $props()
	const parts = getParts()
</script>

<!--
	Первый таб активен сразу — иначе ни одна панель не смонтируется. Панели —
	слотом `content`, вне списка табов.
-->
<Tabs {...bind}>
	{#each COLLECTION_ITEMS as item, index (item.value)}
		<Tabs.Item active={index === 0} {...item} {...parts.Item} />
	{/each}
	{#snippet content()}
		{#each COLLECTION_ITEMS as item (item.value)}
			<Tabs.Content value={item.value} {...parts.Content}>
				<div style="padding: 12px">Панель «{item.text}»</div>
			</Tabs.Content>
		{/each}
	{/snippet}
</Tabs>
