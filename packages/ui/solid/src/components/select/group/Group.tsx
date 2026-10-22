import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Elevate, createPartProps, createRootProps, renderSlot, rootTag } from '../../../adapter'
import { setupSelectGroup } from './setup.component'
import type { SelectGroupProps } from './base.component'

/**
 * SelectGroup — опции списка панели под общей подписью, как `Select.Group` у
 * Vue.
 *
 * Корень по `tag` несёт три набора ядра: `role="group"` и `aria-labelledby` на
 * подпись — имя группы. Опции входят в коллекцию Select сквозь группу:
 * подсветка стрелками ходит по ним, как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
 * `presentation`: список панели — `listbox`, а в нём ARIA пускает только
 * опции и группы.
 *
 * Опции — в слое лифта группы (`Elevate`), и разворачиваются они там же:
 * узлы слота Solid создаёт там, где его развернули, и опция, собранная в
 * теле группы, ключа группы не увидела бы.
 */
export function SelectGroup(props: SelectGroupProps): JSX.Element {
	const binding = setupSelectGroup(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	// Подписи — её набор: своего экземпляра у неё нет
	const labelAria = createPartProps(() => state.labelAria)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Show when={state.label}>
					<div class="so-select-group__label" {...labelAria()}>
						{state.label}
					</div>
				</Show>
				<Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
			</Dynamic>
		</Show>
	)
}
