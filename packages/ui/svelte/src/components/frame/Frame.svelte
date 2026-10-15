<script lang="ts">
	import { Dynamic, Teleport, toRootProps } from '../../adapter'
	import { setupFrame } from './setup.component'
	import type { FrameProps } from './base.component'

	let { ref = $bindable(), ...props }: FrameProps = $props()
	const mountId = $props.id()

	const binding = setupFrame(() => props, mountId, (node) => (ref = node))
	const state = binding.state
</script>

<!--
	Frame — слой поверх страницы: корень уходит телепортом в цель `target` (по
	умолчанию `body`), и на нём же лежит всё остальное — три набора ядра,
	раскладка (`position`, координаты, `z-index` слоя) и атрибуты потребителя.
	Как во Vue, где у Frame `inheritAttrs: false` и атрибуты переносятся на узел
	внутри телепорта вручную.

	Показанный Frame получает номер слоя: он же `z-index` раскладки и
	`data-layer` набора `dataset`, по нему плагины оверлея узнают вложенность.

	На сервере телепорта нет — узел появляется после гидратации (см. `Teleport`).
	`contained` выключает телепорт: панель рисуется на месте и встаёт в
	ближайшем позиционированном предке.
-->
{#if state.rendered}
	<Teleport to={state.target} disabled={state.contained}>
		<Dynamic
			tag={state.tag}
			attributes={toRootProps(
				state,
				[state.attrs, state.aria, state.dataset],
				binding.forwardProps,
			)}
			attach={binding.attachElement}
		>
			{@render props.children?.()}
		</Dynamic>
	</Teleport>
{/if}
