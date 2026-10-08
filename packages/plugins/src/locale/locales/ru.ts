import { freezeLocale } from '../locale'

/** Русский (Россия). */
export const ruRU = freezeLocale({
	tag: 'ru-RU',
	translations: {
		modal: { close: 'Закрыть' },
		dialog: { maximize: 'Развернуть' },
		popover: { close: 'Закрыть' },
		tabs: { close: 'Закрыть {name}' },
		tags: { close: 'Закрыть {name}', more: 'Ещё' },
		scroller: { prev: 'Прокрутить назад', next: 'Прокрутить вперёд' },
		field: { clear: 'Очистить {name}' },
		table: { selectAll: 'Выбрать все' },
		calendar: {
			prevMonth: 'Предыдущий месяц',
			nextMonth: 'Следующий месяц',
			prevYear: 'Предыдущий год',
			nextYear: 'Следующий год',
			prevYears: 'Предыдущие 12 лет',
			nextYears: 'Следующие 12 лет',
		},
		datePicker: { trigger: 'Выбрать дату', start: 'Дата начала', end: 'Дата окончания' },
	},
})
