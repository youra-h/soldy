<script lang="ts">
	import { Select } from '@soldy-ui/svelte'
	import { COLLECTION_ITEMS } from '../../../data'
</script>

<Select placeholder="Выберите" editable>
	{#each COLLECTION_ITEMS as item (item.value)}
		<Select.Item {...item} />
	{/each}
</Select>
