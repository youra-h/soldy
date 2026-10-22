/**
 * Шаблон дня календаря.
 *
 * Корень — сама ячейка `<td is="so-calendar-item">`: классы, наборы `attrs`,
 * `aria` и `dataset` и скрытие раскладывает на неё база (`SoldyElement`).
 * Полосу диапазона тема рисует псевдоэлементом ячейки — своего узла у неё нет.
 *
 * - Плитка дня — `div.so-calendar-item__day`: то, что видно выбранным,
 *   — заливка, наведение, кольцо фокуса, рамка «сегодня». `div`, а не `span`:
 *   в слот кладут и блочное содержимое.
 * - В плитке — слот `default` дня, а без него — номер дня в цифрах локали
 *   (`text`). В слот дня календарь кладёт копию своего образца `item`.
 *
 * Обработчиков у шаблона нет: нажатия и клавиши ловят плагины календаря на
 * его корне. Scope у слотов нет, как у всех слотов Web Components: день и его
 * номер содержимое слота берёт у элемента дня (`el.ctrl`).
 */

import type { ICalendarItem, TCalendarItemCollectionFacade } from '@soldy-ui/core'
import { bind, type ITemplate } from '../../../adapter'

export const calendarItemTemplate: ITemplate<ICalendarItem, TCalendarItemCollectionFacade> = {
	create: (root) => {
		const day = root.ownerDocument.createElement('div')

		day.className = 'so-calendar-item__day'
		root.appendChild(day)

		return {
			slots: {
				default: { mode: 'append', node: day },
			},
		}
	},

	bindings: [
		// Номер дня — плитке, пока содержимое не задано слотом `default`
		bind('text', ({ content, state, hasSlot }) => {
			if (hasSlot('default')) return

			const text = state.text ?? ''

			if (content.textContent !== text) content.textContent = text
		}),
	],
}
