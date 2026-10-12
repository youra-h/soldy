<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { ListBox } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<ListBox {...bind}>
	{#each COLLECTION_ITEMS as item (item.value)}
		<ListBox.Item {...item} />
	{/each}
</ListBox>
