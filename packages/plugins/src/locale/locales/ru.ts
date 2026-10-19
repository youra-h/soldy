import { freezeLocale } from '../locale'

/** Русский (Россия). */
export const ruRU = freezeLocale({
	tag: 'ru-RU',
	translations: {
		modal: { close: 'Закрыть' },
		dialog: { maximize: 'Развернуть' },
		popover: { close: 'Закрыть' },
		tabs: { close: 'Закрыть {name}' },
		tags: { close: 'Закрыть {name}' },
		toasts: { region: 'Уведомления (F8)', close: 'Закрыть {name}' },
		scroller: { prev: 'Прокрутить назад', next: 'Прокрутить вперёд' },
		pagination: { prev: 'Предыдущая страница', next: 'Следующая страница' },
		field: { clear: 'Очистить {name}' },
		table: { selectAll: 'Выбрать все', sort: 'Сортировать по столбцу {name}' },
		calendar: {
			prevMonth: 'Предыдущий месяц',
			nextMonth: 'Следующий месяц',
			prevYear: 'Предыдущий год',
			nextYear: 'Следующий год',
			prevYears: 'Предыдущие 12 лет',
			nextYears: 'Следующие 12 лет',
		},
		datePicker: {
			trigger: 'Выбрать дату',
			start: 'Дата начала',
			end: 'Дата окончания',
			confirm: 'ОК',
			cancel: 'Отмена',
		},
		rating: {
			value: '{value} из {max}',
			required: 'Поставьте оценку',
		},
		textarea: { counter: '{count} / {max}' },
	},
})
