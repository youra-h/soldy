<script lang="ts">
	import { setupDragAndDrop } from './setup.component'
	import type { DragAndDropProps } from './base.component'

	const props: DragAndDropProps = $props()
	const mountId = $props.id()

	setupDragAndDrop(() => props, mountId)
</script>

<!--
	DragAndDrop — перестановка элементов коллекций перетаскиванием: элементы
	Tabs, ListBox и Accordion внутри переставляют жестом, а о перестановке
	сообщают события обёртки — `onMoveBefore` (отмена — `preventDefault()`) и
	`onMove`.

	Своего узла у обёртки нет, как у Vue, React и Solid: разметка — только
	дети. Свой экземпляр проводка обёртки опускает лифтом при её
	инициализации, и коллекция, смонтированная в детях, подхватывает его своей.
-->
{@render props.children?.()}
