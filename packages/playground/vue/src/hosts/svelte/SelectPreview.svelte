<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { Select } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Опции — разметкой, а пришли данными (`items` блока групп страницы) — из
	них: разметка заменила бы данные, а группы Select рисует из данных, как у
	Vue.
-->
{#if bind.items}
	<Select {...bind} />
{:else}
	<Select {...bind}>
		{#each COLLECTION_ITEMS as item (item.value)}
			<Select.Item {...item} />
		{/each}
	</Select>
{/if}
