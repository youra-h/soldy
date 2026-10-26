<script lang="ts">
	import { Tab, TabContent, Tabs } from 'carbon-components-svelte'
	import { COLLECTION_ITEMS } from '../../../data'
</script>

<!-- Tabs and a panel per tab, as the soldy preview: «Панель «…»» -->
<Tabs>
	{#each COLLECTION_ITEMS as item (item.value)}
		<Tab label={item.text} />
	{/each}
	<svelte:fragment slot="content">
		{#each COLLECTION_ITEMS as item (item.value)}
			<TabContent>
				<div style="padding: 12px">Панель «{item.text}»</div>
			</TabContent>
		{/each}
	</svelte:fragment>
</Tabs>
