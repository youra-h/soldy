<script lang="ts">
	import { setupDragAndDrop } from './setup.component'
	import type { DragAndDropProps } from './base.component'

	const props: DragAndDropProps = $props()
	const mountId = $props.id()

	setupDragAndDrop(() => props, mountId)
</script>

<!-- Своего узла нет: экземпляр обёртки коллекция в детях подхватывает лифтом. -->
{@render props.children?.()}
