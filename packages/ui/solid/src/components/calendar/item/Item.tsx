import type { JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, resolveSlot, rootTag } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupCalendarItem } from './setup.component'
import type { CalendarItemProps } from './base.component'

/**
 * CalendarItem — день календаря, `Calendar.Item`. Корень — сама ячейка сетки,
 * рисуется по `tag` (по умолчанию `td`): по APG (Date Picker Dialog) фокус
 * стоит на ячейке, и на ней же наборы — `attrs`, `aria` (имя — полная дата,
 * `aria-selected`, `aria-current`, `aria-disabled`, `tabindex` остановки Tab) и
 * `dataset` (отметки выбора, «сегодня», «недоступен», «выключен»), поверх —
 * атрибуты потребителя, `ref` адаптера последним. Кнопки внутри ячейки нет:
 * фокус на ней развёл бы ячейку и то, что фокусируют. Нажатия и клавиши ловят
 * плагины календаря на его корне, обработчиков здесь нет.
 *
 * Полосу диапазона тема рисует псевдоэлементом ячейки — своего узла у неё нет.
 *
 * Плитка дня (`so-calendar-item__day`) — то, что видно выбранным: заливка,
 * наведение, кольцо фокуса, рамка «сегодня»; `div`, а не `span`: в слот кладут
 * и блочное содержимое. В ней — слот `children` со scope `{ text }` (номер дня
 * в цифрах локали), без него — сам номер. По слоту разметка выбирает, что
 * рисовать, поэтому его разворачивает адаптер, один раз (`resolveSlot`):
 * пустое, что вернул проброс календаря, уступает место номеру.
 */
export function CalendarItem(props: CalendarItemProps): JSX.Element {
	const binding = setupCalendarItem(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				<div class="so-calendar-item__day">{content() ?? state.text}</div>
			</Dynamic>
		</Show>
	)
}
