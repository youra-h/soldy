<script lang="ts">
	import { setupVirtual } from './setup.component'
	import type { VirtualProps } from './base.component'

	const props: VirtualProps = $props()
	const mountId = $props.id()

	setupVirtual(() => props, mountId)
</script>

<!--
	Virtual — окно для длинных списков: коллекции внутри (ListBox, Table)
	рисуют только видимые элементы, а на месте остальных — распорки той же
	высоты. Выключатель — `enabled`.

	Своего узла у обёртки нет, как у Vue, React и Solid: разметка — только
	дети. Подключение к окну проводка обёртки опускает лифтом при её
	инициализации, и коллекция, смонтированная в детях, подхватывает его своей.
-->
{@render props.children?.()}
