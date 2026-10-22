import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Elevate, createPartProps, createRootProps, renderSlot, rootTag } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupMenuRadioGroup } from './setup.component'
import type { MenuRadioGroupProps } from './base.component'

/**
 * MenuRadioGroup — переключатели меню под общей подписью, как
 * `Menu.RadioGroup` у Vue. Разметка — как у группы меню (`MenuGroup`):
 * `role="group"` и `aria-labelledby` на подпись — имя группы. Роли
 * `radiogroup` нет: в меню группа переключателей — `group` (APG).
 * Переключатели входят в коллекцию меню сквозь группу: навигация ходит по ним,
 * как по одному списку.
 *
 * Подпись — текст `label`; нет подписи — нет и её узла, и ссылки на неё у
 * группы тоже нет. `id` подписи — в её наборе (`labelAria`).
 *
 * Переключатели — в слое лифта группы (`Elevate`): там их ждут ключ группы
 * для группировки меню и сама группа, в которой отмечен один, — и
 * разворачиваются они там же: переключатель, собранный в теле группы, её бы
 * не увидел.
 */
export function MenuRadioGroup(props: MenuRadioGroupProps): JSX.Element {
	const binding = setupMenuRadioGroup(props)
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
