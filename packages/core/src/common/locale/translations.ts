import type { TNamedText, TTranslations } from './types'

/**
 * Строка с именем по-английски: «Close Настройки», а без имени — одно слово.
 * Пустое имя дало бы висящий пробел, а повтор слова — ничего.
 */
function withName(word: string): TNamedText {
	return (name) => (name ? `${word} ${name}` : word)
}

/**
 * Английский словарь — с ним компонент стартует и на него накладывает свои
 * строки приложение (`useTranslations`).
 *
 * Заморожен вместе с разделами: объект один на всю библиотеку, и правка на
 * месте молча переименовала бы кнопки у всех компонентов, не сообщив ни
 * одному.
 */
export const DEFAULT_TRANSLATIONS: TTranslations = Object.freeze({
	modal: Object.freeze({ close: 'Close' }),
	dialog: Object.freeze({ maximize: 'Maximize' }),
	popover: Object.freeze({ close: 'Close' }),
	tabs: Object.freeze({ close: withName('Close') }),
	tags: Object.freeze({ close: withName('Close'), more: 'More' }),
	scroller: Object.freeze({ prev: 'Scroll back', next: 'Scroll forward' }),
	field: Object.freeze({ clear: withName('Clear') }),
	table: Object.freeze({ selectAll: 'Select all' }),
	calendar: Object.freeze({
		prevMonth: 'Previous month',
		nextMonth: 'Next month',
		prevYear: 'Previous year',
		nextYear: 'Next year',
		prevYears: 'Previous 12 years',
		nextYears: 'Next 12 years',
	}),
	datePicker: Object.freeze({
		trigger: 'Choose date',
		start: 'Start date',
		end: 'End date',
	}),
})
