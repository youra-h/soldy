import { freezeLocale } from '../locale'

/**
 * Английский (США) — локаль по умолчанию: её получает набор без провайдера.
 *
 * `en-US`, а не язык среды: сервер и браузер без заданной локали рисуют одно
 * и то же.
 */
export const enUS = freezeLocale({
	tag: 'en-US',
	translations: {
		modal: { close: 'Close' },
		dialog: { maximize: 'Maximize' },
		popover: { close: 'Close' },
		tabs: { close: 'Close {name}' },
		tags: { close: 'Close {name}' },
		scroller: { prev: 'Scroll back', next: 'Scroll forward' },
		field: { clear: 'Clear {name}' },
		table: { selectAll: 'Select all' },
		calendar: {
			prevMonth: 'Previous month',
			nextMonth: 'Next month',
			prevYear: 'Previous year',
			nextYear: 'Next year',
			prevYears: 'Previous 12 years',
			nextYears: 'Next 12 years',
		},
		datePicker: {
			trigger: 'Choose date',
			start: 'Start date',
			end: 'End date',
			confirm: 'OK',
			cancel: 'Cancel',
		},
	},
})
