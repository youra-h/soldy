import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../../adapter'
import { useSetupCalendarItem } from './setup.component'
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
 * в цифрах локали), без него — сам номер: проброс календаря без его слота
 * `item` не задан вовсе, и номер встаёт на место пустого.
 */
export function CalendarItem(props: CalendarItemProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupCalendarItem(props)

	const { rendered, tag, text, attrs, aria, dataset } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			<div className="so-calendar-item__day">
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</div>
		</Tag>
	)
}
