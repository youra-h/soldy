import { describe, it, expect, vi } from 'vitest'
import {
	DEFAULT_TRANSLATIONS,
	TCalendar,
	TDateInput,
	TDatePicker,
	TDialog,
	TDrawer,
	TInput,
	TPopover,
	TScroller,
	TSelect,
	TTable,
	TTabsItem,
	TTags,
	TTagsItem,
} from '@soldy-ui/core'
import type { ITranslatable, TTranslations } from '@soldy-ui/core'

/**
 * Словарь строк библиотеки: имена кнопок без текста и полей без подписи
 * компонент собирает из своего раздела `translations`, а не из пропсов.
 *
 * Умолчание — английский словарь, и имена по нему — ровно те, что раньше
 * давали английские умолчания пропсов. Новый словарь — одно
 * `change:translations` и новые имена; та же ссылка — ничего. Строка с именем
 * части — функция: имя приходит без пробелов по краям, пустое — тоже.
 *
 * Пишет словарь компоненту плагин словаря (`plugins/__tests__/locale.spec.ts`),
 * здесь — только ядро: запись свойством.
 */

/** Полный словарь на другом языке: имя части стоит внутри фразы. */
const RU: TTranslations = {
	modal: { close: 'Закрыть' },
	dialog: { maximize: 'Развернуть' },
	popover: { close: 'Закрыть панель' },
	tabs: { close: (name) => `Закрыть вкладку «${name}»` },
	tags: { close: (name) => `Удалить тег «${name}»`, more: 'Ещё' },
	scroller: { prev: 'Назад', next: 'Вперёд' },
	field: { clear: (name) => `Очистить поле «${name}»` },
	table: { selectAll: 'Выбрать все' },
	calendar: {
		prevMonth: 'Предыдущий месяц',
		nextMonth: 'Следующий месяц',
		prevYear: 'Предыдущий год',
		nextYear: 'Следующий год',
		prevYears: 'Предыдущие 12 лет',
		nextYears: 'Следующие 12 лет',
	},
	datePicker: { trigger: 'Выбрать дату', start: 'Заезд', end: 'Выезд' },
}

/** Компонент со словарём: подписка на смену словаря и имена, собранные из него. */
type TSubject = {
	readonly target: ITranslatable
	readonly onChange: (handler: (value: TTranslations) => void) => void
	readonly names: () => unknown
}

/** Строка таблицы: как собрать компонент и что он называет по-английски и по-русски. */
type TRow = [name: string, create: () => TSubject, english: unknown, translated: unknown]

const ROWS: TRow[] = [
	[
		'Dialog — крестик и разворот',
		() => {
			const target = new TDialog()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => [target.closeAria['aria-label'], target.maximizeAria['aria-label']],
			}
		},
		['Close', 'Maximize'],
		['Закрыть', 'Развернуть'],
	],
	[
		'Drawer — крестик',
		() => {
			const target = new TDrawer()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => target.closeAria['aria-label'],
			}
		},
		'Close',
		'Закрыть',
	],
	[
		'Popover — крестик',
		() => {
			const target = new TPopover()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => target.closeAria['aria-label'],
			}
		},
		'Close',
		'Закрыть панель',
	],
	[
		'Tabs.Item — крестик с текстом таба',
		() => {
			const target = new TTabsItem({ text: 'Почта' })

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => target.closeAria['aria-label'],
			}
		},
		'Close Почта',
		'Закрыть вкладку «Почта»',
	],
	[
		'Tags.Item — крестик с текстом тега',
		() => {
			const target = new TTagsItem({ text: 'Почта' })

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => target.closeAria.get('aria-label'),
			}
		},
		'Close Почта',
		'Удалить тег «Почта»',
	],
	[
		'Tags — кнопка «…»',
		() => {
			const target = new TTags()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => [target.moreLabel, target.moreAria['aria-label']],
			}
		},
		['More', 'More'],
		['Ещё', 'Ещё'],
	],
	[
		'Scroller — кнопки листания',
		() => {
			const target = new TScroller()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => [target.prevAria['aria-label'], target.nextAria['aria-label']],
			}
		},
		['Scroll back', 'Scroll forward'],
		['Назад', 'Вперёд'],
	],
	[
		'Input — очистка с именем поля',
		() => {
			const target = new TInput({ name: 'Город' })

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => target.clearAria['aria-label'],
			}
		},
		'Clear Город',
		'Очистить поле «Город»',
	],
	[
		'DateInput — очистка с именем поля',
		() => {
			const target = new TDateInput({ name: 'Дата' })

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => target.clearAria['aria-label'],
			}
		},
		'Clear Дата',
		'Очистить поле «Дата»',
	],
	[
		'Table — чекбокс «выбрать все»',
		() => {
			const target = new TTable()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => target.selectAllLabel,
			}
		},
		'Select all',
		'Выбрать все',
	],
	[
		'Calendar — кнопки листания',
		() => {
			const target = new TCalendar()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => [target.prevAria['aria-label'], target.nextAria['aria-label']],
			}
		},
		['Previous month', 'Next month'],
		['Предыдущий месяц', 'Следующий месяц'],
	],
	[
		'DatePicker — кнопка, панель и концы диапазона',
		() => {
			const target = new TDatePicker()

			return {
				target,
				onChange: (handler) => target.events.on('change:translations', handler),
				names: () => [
					target.triggerAria.get('aria-label'),
					target.panelAria.get('aria-label'),
					target.startLabel,
					target.endLabel,
				],
			}
		},
		['Choose date', 'Choose date', 'Start date', 'End date'],
		['Выбрать дату', 'Выбрать дату', 'Заезд', 'Выезд'],
	],
]

describe('умолчание — английский словарь', () => {
	it.each(ROWS)('%s: прежние английские имена', (_name, create, english) => {
		const { target, names } = create()

		expect(target.translations).toBe(DEFAULT_TRANSLATIONS)
		expect(names()).toEqual(english)
	})

	it('заморожен вместе с разделами: объект один на всю библиотеку', () => {
		expect(Object.isFrozen(DEFAULT_TRANSLATIONS)).toBe(true)

		for (const section of Object.values(DEFAULT_TRANSLATIONS)) {
			expect(Object.isFrozen(section)).toBe(true)
		}
	})
})

describe('новый словарь', () => {
	it.each(ROWS)(
		'%s: одно change:translations, и имена уже новые',
		(_name, create, _, translated) => {
			const { target, onChange, names } = create()
			const seen: unknown[] = []

			onChange((value) => seen.push(names(), value))
			target.translations = RU

			expect(seen).toEqual([translated, RU])
			expect(names()).toEqual(translated)
		},
	)

	it.each(ROWS)('%s: та же ссылка — событий нет', (_name, create) => {
		const { target, onChange } = create()
		const changes = vi.fn()

		onChange(changes)
		target.translations = DEFAULT_TRANSLATIONS

		expect(changes).not.toHaveBeenCalled()

		target.translations = RU
		target.translations = RU

		expect(changes).toHaveBeenCalledTimes(1)
	})
})

/**
 * Порядок слов у каждого языка свой, поэтому строку с именем собирает функция
 * словаря, а не склейка «слово + имя». Имя ей приходит без пробелов по краям:
 * пустое — у части нет имени, и что сказать тогда, решает функция.
 */
describe('строка с именем — функция', () => {
	it('получает имя без пробелов по краям и пустое имя', () => {
		const close = vi.fn((name: string) => `[${name}]`)
		const translations: TTranslations = { ...DEFAULT_TRANSLATIONS, tabs: { close } }
		const named = new TTabsItem({ text: '  Почта  ' })
		const unnamed = new TTabsItem()

		named.translations = translations
		unnamed.translations = translations

		expect(named.closeAria['aria-label']).toBe('[Почта]')
		expect(unnamed.closeAria['aria-label']).toBe('[]')
		expect(close.mock.calls).toEqual([['Почта'], ['']])
	})

	it('английская без имени — одно слово, без висящего пробела', () => {
		expect(DEFAULT_TRANSLATIONS.tabs.close('')).toBe('Close')
		expect(DEFAULT_TRANSLATIONS.tags.close('Почта')).toBe('Close Почта')
		expect(DEFAULT_TRANSLATIONS.field.clear('')).toBe('Clear')
		expect(new TInput({ name: '  ' }).clearAria['aria-label']).toBe('Clear')
	})
})

describe('словарь есть у тех, кто его читает', () => {
	/**
	 * Кнопку очистки Select рисует его поле, и имя ей собирает поле из своего
	 * словаря: через Select строки не идут.
	 */
	it('у Select словаря нет — он у его поля', () => {
		const select = new TSelect({ name: 'Город' })

		expect('translations' in select).toBe(false)
		expect(select.field.translations).toBe(DEFAULT_TRANSLATIONS)
	})
})
