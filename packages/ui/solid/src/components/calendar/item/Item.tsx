import type { JSX } from 'solid-js'
import { Root, createRootProps, resolveSlot } from '../../../adapter'
import { Show } from '../../../adapter/runtime/flow'
import { setupCalendarItem } from './setup.component'
import type { CalendarItemProps } from './base.component'

/**
 * День календаря — сама ячейка сетки (`td`), фокус и наборы на ней. Плитка дня — `div`,
 * а не `span`: в слот кладут и блочное содержимое. Полосу диапазона тема рисует
 * псевдоэлементом ячейки — своего узла у неё нет.
 */
export function CalendarItem(props: CalendarItemProps): JSX.Element {
	const binding = setupCalendarItem(props)
	const state = binding.state
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
			<Root tag={state.tag} attributes={root} ref={binding.ref}>
				<div class="so-calendar-item__day">{content() ?? state.text}</div>
			</Root>
		</Show>
	)
}
