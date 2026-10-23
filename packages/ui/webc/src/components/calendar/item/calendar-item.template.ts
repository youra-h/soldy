/**
 * Шаблон дня: плитка `div.so-calendar-item__day` — `div`, потому что в слот
 * кладут и блочное содержимое. Полосу диапазона тема рисует псевдоэлементом ячейки.
 */

import type { ICalendarItem, TCalendarItemCollectionFacade } from '@soldy-ui/core'
import { bind, type ITemplate, patch } from '../../../adapter'

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
		bind('text', ({ content, state, hasSlot }) => {
			if (hasSlot('default')) return

			const text = state.text ?? ''

			patch(content, { textContent: text })
		}),
	],
}
