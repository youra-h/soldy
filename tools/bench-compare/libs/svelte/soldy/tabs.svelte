<script lang="ts">
	import { Tabs } from '@soldy-ui/svelte'
	import { COLLECTION_ITEMS } from '../../../data'
</script>

<Tabs>
	{#each COLLECTION_ITEMS as item, index (item.value)}
		<Tabs.Item active={index === 0} {...item} />
	{/each}
	{#snippet content()}
		{#each COLLECTION_ITEMS as item (item.value)}
			<Tabs.Content value={item.value}>
				<div style="padding: 12px">Панель «{item.text}»</div>
			</Tabs.Content>
		{/each}
	{/snippet}
</Tabs>
