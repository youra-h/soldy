<script lang="ts">
	import { Tabs } from 'bits-ui'
	import { COLLECTION_ITEMS } from '../../../data'
</script>

<!-- Tabs and a panel per tab, as the soldy preview: «Панель «…»» -->
<Tabs.Root value={COLLECTION_ITEMS[0].value}>
	<Tabs.List>
		{#each COLLECTION_ITEMS as item (item.value)}
			<Tabs.Trigger value={item.value}>{item.text}</Tabs.Trigger>
		{/each}
	</Tabs.List>
	{#each COLLECTION_ITEMS as item (item.value)}
		<Tabs.Content value={item.value}>
			<div style="padding: 12px">Панель «{item.text}»</div>
		</Tabs.Content>
	{/each}
</Tabs.Root>
