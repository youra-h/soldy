import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Teleport, createRootProps, renderSlot, rootTag } from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { setupFrame } from './setup.component'
import type { FrameProps } from './base.component'

/**
 * Frame — слой поверх страницы: корень уходит телепортом в цель `target` (по
 * умолчанию `body`), и на нём же лежит всё остальное — три набора ядра,
 * раскладка (`position`, координаты, `z-index` слоя) и атрибуты потребителя.
 * Как во Vue, где у Frame `inheritAttrs: false` и атрибуты переносятся на узел
 * внутри телепорта вручную.
 *
 * Показанный Frame получает номер слоя: он же `z-index` раскладки и
 * `data-layer` набора `dataset`, по нему плагины оверлея узнают вложенность.
 *
 * На сервере телепорта нет — узел появляется на клиенте (см. `Teleport`).
 * `contained` выключает телепорт: панель рисуется на месте и встаёт в
 * ближайшем позиционированном предке.
 */
export function Frame(props: FrameProps): JSX.Element {
	const binding = setupFrame(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Teleport to={state.target} disabled={state.contained}>
				<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
					{renderSlot(props.children)}
				</Dynamic>
			</Teleport>
		</Show>
	)
}
