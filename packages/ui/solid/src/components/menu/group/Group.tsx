import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Elevate, createPartProps, createRootProps, renderSlot, rootTag } from '../../../adapter'
import { setupMenuGroup } from './setup.component'
import type { MenuGroupProps } from './base.component'

/**
 * MenuGroup — пункты меню под общей подписью, как `Menu.Group` у Vue.
 *
 * Корень по `tag` несёт три набора ядра: `role="group"` и `aria-labelledby` на
 * подпись — имя группы. Пункты входят в коллекцию меню сквозь группу:
 * навигация ходит по ним, как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. `id` подписи — в её наборе (`labelAria`): подпись —
 * разметка без своего экземпляра.
 *
 * Пункты — в слое лифта группы (`Elevate`), и разворачиваются они там же:
 * узлы слота Solid создаёт там, где его развернули, и пункт, собранный в теле
 * группы, ключа группы не увидел бы.
 */
export function MenuGroup(props: MenuGroupProps): JSX.Element {
	const binding = setupMenuGroup(props)
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
					<div class="so-menu-group__label" {...labelAria()}>
						{state.label}
					</div>
				</Show>
				<Elevate layer={binding.layer}>{renderSlot(props.children)}</Elevate>
			</Dynamic>
		</Show>
	)
}
