<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { Scroller } from '@soldy-ui/svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Содержимое ленты — просто разметка: коллекции у неё нет, и делить ей
	нечего. Каждый элемент — прямой ребёнок вьюпорта: по ним тема ставит точки
	снапа, а плагин считает края.

	Обёртка — граница ширины, та же ловушка, что у превью Tags: сцена ячейки —
	флексбокс, у флекс-элемента автоминимум равен содержимому, и лента с
	шириной по содержимому вылезла бы за колонку целиком — листать стало бы
	нечего.
-->
<div style="width: 100%">
	<Scroller {...bind}>
		{#each COLLECTION_ITEMS as item (item.value)}
			<span style="padding: 4px 12px; white-space: nowrap">{item.text} пункт ленты</span>
		{/each}
	</Scroller>
</div>
