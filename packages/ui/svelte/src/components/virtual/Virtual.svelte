<script lang="ts">
	import { setupVirtual } from './setup.component'
	import type { VirtualProps } from './base.component'

	const props: VirtualProps = $props()
	const mountId = $props.id()

	setupVirtual(() => props, mountId)
</script>

<!-- Своего узла нет: подключение к окну коллекция в детях подхватывает лифтом. -->
{@render props.children?.()}
