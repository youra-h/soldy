import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Elevate, createRootProps, renderSlot, rootTag } from '../../../adapter'
import { setupListBoxGroup } from './setup.component'
import type { ListBoxGroupProps } from './base.component'

/**
 * ListBoxGroup — элементы списка под общей подписью, как `ListBox.Group` у Vue.
 *
 * Корень по `tag` несёт три набора ядра: `role="group"` и `aria-labelledby` на
 * подпись — имя группы. Элементы входят в коллекцию списка сквозь группу:
 * навигация ходит по ним, как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. Набор подписи (`labelAria`) — её `id` и роль
 * `presentation`: в `listbox` ARIA пускает только опции и группы.
 *
 * Элементы — в слое лифта группы (`Elevate`), и разворачиваются они там же:
 * узлы слота Solid создаёт там, где его развернули, и элемент, собранный в
 * теле группы, ключа группы не увидел бы.
 */
export function ListBoxGroup(props: ListBoxGroupProps): JSX.Element {
	const binding = setupListBoxGroup(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<Show when={state.label}>
					<div class="so-list-box-group__label" {...state.labelAria}>
						{state.label}
					</div>
				</Show>
				<Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
			</Dynamic>
		</Show>
	)
}
