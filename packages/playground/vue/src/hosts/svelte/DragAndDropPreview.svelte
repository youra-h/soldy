<script lang="ts">
	import { COLLECTION_ITEMS } from '@soldy-ui/playground-shared'
	import { DragAndDrop, ListBox } from '@soldy-ui/svelte'
	import AccordionPreview from './AccordionPreview.svelte'
	import TabsPreview from './TabsPreview.svelte'
	import type { TPreviewProps } from './previews'

	const bind: TPreviewProps = $props()
</script>

<!--
	Перестановка у трёх коллекций сразу, на одном составе: Tabs и Accordion —
	превью их страниц, без пропсов строки, ListBox — данными, как у Vue, React
	и Solid. Элемент переставляется в своей коллекции: между коллекциями
	обёртка не переносит. Ряд — граница ширины, как у окна: табы — во всю
	ширину ряда, список и секции — под ними, рядом.
-->
<DragAndDrop {...bind}>
	<div style="display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; width: 100%">
		<div style="flex: 1 1 100%; min-width: 0">
			<TabsPreview />
		</div>
		<ListBox items={COLLECTION_ITEMS} aria_label="Пункты" />
		<div style="flex: 1; min-width: 200px">
			<AccordionPreview />
		</div>
	</div>
</DragAndDrop>
