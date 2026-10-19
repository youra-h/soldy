<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { ListBox } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Элементы — разметкой, а пришли данными (`items` блока групп страницы) — из
	них: разметка заменила бы данные, а группы список рисует из данных.
-->
{#if bind.items}
	<ListBox {...bind} />
{:else}
	<ListBox {...bind}>
		{#each COLLECTION_ITEMS as item (item.value)}
			<ListBox.Item {...item} />
		{/each}
	</ListBox>
{/if}
