import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { Elevate, ResolvedSlot, createRootProps, relaySlot, rootTag } from '../../adapter'
import { For, Show } from '../../adapter/runtime/flow'
import { RadioGroupItem } from './item'
import { setupRadioGroup } from './setup.component'
import type { RadioGroupProps } from './base.component'

/**
 * RadioGroup — группа радио, «один из N»: корень по `tag` (по умолчанию `div`).
 *
 * Корень — контейнер группы. Набор `aria` владельца — на нём, как у Vue:
 * `role="radiogroup"` пишет ядро, имя из `aria_label` / `aria_labelledBy` —
 * `TAriaPlugin`. Стилей у контейнера в теме нет: радио одной группы стоят где
 * угодно внутри — в строках списка, в ячейках таблицы, — и раскладку задаёт
 * потребитель.
 *
 * Радио — содержимое (`<RadioGroup.Item>`), а без него — `shown` коллекции,
 * по `RadioGroupItem` на элемент. Слот подписи статический и получает радио
 * через scope (`item`), как у остальных коллекций, — вместе со scope подписи
 * самого радио (`active`): радио получает его функцией (`relaySlot`), а не
 * готовыми узлами.
 *
 * Всё содержимое — в слое лифта группы (`Elevate`): радио, смонтированное
 * внутри, прочтёт движок и регистратор этой группы и при своей сборке войдёт в
 * её коллекцию. Содержимое разворачивается там же (`ResolvedSlot`), а не в
 * теле группы: узлы радио Solid создал бы там, где развернули слот, — вне её
 * слоя.
 */
export function RadioGroup(props: RadioGroupProps): JSX.Element {
	const binding = setupRadioGroup(props)
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
				<Elevate layer={binding.layer}>
					<ResolvedSlot
						content={props.children}
						fallback={
							<For each={state.shown}>
								{(item) => (
									<RadioGroupItem ctrl={item}>
										{relaySlot(props.item, { item })}
									</RadioGroupItem>
								)}
							</For>
						}
					/>
				</Elevate>
			</Dynamic>
		</Show>
	)
}
