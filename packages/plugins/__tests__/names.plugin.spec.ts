/**
 * Плагины имён (неймспейс `names`): строки локали поддерева в наборы кнопок
 * компонента.
 *
 * Каждый пишет при установке, синхронно, — имена есть уже в первой и
 * серверной отрисовке, — и переписывает на смену локали источника, а имя с
 * текстом части — ещё и на смену текста. После `destroy()` набора не пишет
 * ничего. Набор кнопки — компонента: плагин пишет в него только `aria-label`.
 */

import { describe, expect, it, vi } from 'vitest'
import {
	TDateInput,
	TDatePicker,
	TDialog,
	TDrawer,
	TInput,
	TPagination,
	TPopover,
	TRating,
	TScroller,
	TTable,
	TTableColumn,
	TTabsItem,
	TTagsItem,
	TTextarea,
	TToasts,
	TToastsItem,
} from '@soldy-ui/core'
import {
	TDatePickerNamesPlugin,
	TDialogNamesPlugin,
	TClearableNamesPlugin,
	TLocaleSource,
	TModalNamesPlugin,
	TPaginationNamesPlugin,
	TPluginBundle,
	TPopoverNamesPlugin,
	TRatingNamesPlugin,
	TScrollerNamesPlugin,
	TTableColumnNamesPlugin,
	TTableNamesPlugin,
	TTabsItemNamesPlugin,
	TTagsItemNamesPlugin,
	TTextareaNamesPlugin,
	TToastsItemNamesPlugin,
	TToastsNamesPlugin,
	arEG,
	enUS,
	extendLocale,
	ruRU,
} from '../src'
import type { IPlugin, IPluginConstructor, TLocale } from '../src'

/** Набор на владельце с источником локали; плагин — установленным. */
function mount<P extends IPlugin<any, any>>(
	owner: object,
	Plugin: IPluginConstructor<any, any, P>,
	locale: TLocale = enUS,
) {
	const source = new TLocaleSource(locale)
	const bundle = new TPluginBundle(owner, 'm1', source).use(Plugin)

	return { source, bundle, plugin: bundle.get(Plugin) }
}

describe('имена при установке и на смену локали', () => {
	it('Drawer: крестик — modal.close', () => {
		const drawer = new TDrawer()
		const { source } = mount(drawer, TModalNamesPlugin)

		expect(drawer.closeAria.get('aria-label')).toBe('Close')

		source.locale = ruRU

		expect(drawer.closeAria.get('aria-label')).toBe('Закрыть')
	})

	it('Dialog: крестик и разворот; aria-pressed — окна, плагин его не трогает', () => {
		const dialog = new TDialog({ maximized: true })
		const { source } = mount(dialog, TDialogNamesPlugin, ruRU)

		expect(dialog.closeAria.get('aria-label')).toBe('Закрыть')
		expect(dialog.maximizeAria.valueOf()).toEqual({
			'aria-pressed': 'true',
			'aria-label': 'Развернуть',
		})

		source.locale = enUS

		expect(dialog.maximizeAria.get('aria-label')).toBe('Maximize')
	})

	it('Popover: крестик — popover.close', () => {
		const popover = new TPopover()

		mount(popover, TPopoverNamesPlugin, ruRU)

		expect(popover.closeAria.valueOf()).toEqual({ 'aria-label': 'Закрыть' })
	})

	it('Scroller: обе кнопки листания', () => {
		const scroller = new TScroller()
		const { source } = mount(scroller, TScrollerNamesPlugin)

		expect(scroller.prevAria.get('aria-label')).toBe('Scroll back')
		expect(scroller.nextAria.get('aria-label')).toBe('Scroll forward')

		source.locale = ruRU

		expect(scroller.prevAria.get('aria-label')).toBe('Прокрутить назад')
		expect(scroller.nextAria.get('aria-label')).toBe('Прокрутить вперёд')
	})

	it('Pagination: обе стрелки; ряд плагин не называет', () => {
		const pagination = new TPagination()
		const { source, bundle } = mount(pagination, TPaginationNamesPlugin)

		expect(pagination.prevAria.get('aria-label')).toBe('Previous page')
		expect(pagination.nextAria.get('aria-label')).toBe('Next page')
		// Имя ряду даёт приложение: что листают, знает только оно
		expect(pagination.aria.has('aria-label')).toBe(false)

		source.locale = arEG

		expect(pagination.prevAria.get('aria-label')).toBe(arEG.translations.pagination.prev)
		expect(pagination.nextAria.get('aria-label')).toBe(arEG.translations.pagination.next)

		bundle.destroy()
		source.locale = ruRU

		expect(pagination.prevAria.get('aria-label')).toBe(arEG.translations.pagination.prev)
	})

	it('Toasts: имя региона — toasts.region, вместе с клавишей', () => {
		const toasts = new TToasts()
		const { source } = mount(toasts, TToastsNamesPlugin)

		expect(toasts.aria.get('aria-label')).toBe('Notifications (F8)')
		// Роль и живую область пишет ядро — плагин их не трогает
		expect(toasts.aria.get('role')).toBe('region')

		source.locale = ruRU

		expect(toasts.aria.get('aria-label')).toBe('Уведомления (F8)')
	})

	it('смена локали — одна запись в набор на кнопку, та же строка — ни одной', () => {
		const popover = new TPopover()
		const changes = vi.fn()
		const { source } = mount(popover, TPopoverNamesPlugin)
		const sameStrings = extendLocale(enUS, { tag: 'en-GB' })

		popover.events.on('change:closeAria', changes)

		source.locale = sameStrings

		expect(changes).not.toHaveBeenCalled()

		source.locale = ruRU

		expect(changes).toHaveBeenCalledExactlyOnceWith({ 'aria-label': 'Закрыть' })
	})
})

describe('имя с текстом части: шаблон локали и смена текста', () => {
	it('Tabs.Item: текст таба на месте {name}; tabindex — таба', () => {
		const item = new TTabsItem({ text: 'Почта', closable: true })
		const { source } = mount(item, TTabsItemNamesPlugin)

		expect(item.closeAria.valueOf()).toEqual({ tabindex: '-1', 'aria-label': 'Close Почта' })

		item.text = 'Настройки'

		expect(item.closeAria.get('aria-label')).toBe('Close Настройки')

		source.locale = extendLocale(enUS, {
			translations: { tabs: { close: '{name} — закрыть' } },
		})

		expect(item.closeAria.get('aria-label')).toBe('Настройки — закрыть')
	})

	it('Tabs.Item: без текста — одно слово', () => {
		const item = new TTabsItem({ closable: true })

		mount(item, TTabsItemNamesPlugin, ruRU)

		expect(item.closeAria.get('aria-label')).toBe('Закрыть')
	})

	it('Tags.Item: текст тега на месте {name}', () => {
		const tag = new TTagsItem({ text: 'Почта' })

		mount(tag, TTagsItemNamesPlugin, ruRU)

		expect(tag.closeAria.get('aria-label')).toBe('Закрыть Почта')

		tag.text = 'Работа'

		expect(tag.closeAria.get('aria-label')).toBe('Закрыть Работа')
	})

	/**
	 * Кнопка сортировки — своим набором (`sortAria`): имя заголовка — подпись
	 * колонки, и плагин его не трогает.
	 */
	it('Table.Column: подпись колонки на месте {name}; заголовок плагин не называет', () => {
		const column = new TTableColumn({ field: 'name', text: 'Имя', sortable: true })
		const { source } = mount(column, TTableColumnNamesPlugin)

		expect(column.sortAria.valueOf()).toEqual({ 'aria-label': 'Sort by Имя' })
		expect(column.aria.has('aria-label')).toBe(false)

		source.locale = ruRU

		expect(column.sortAria.get('aria-label')).toBe('Сортировать по столбцу Имя')

		column.text = 'Фамилия'

		expect(column.sortAria.get('aria-label')).toBe('Сортировать по столбцу Фамилия')

		source.locale = extendLocale(enUS, {
			translations: { table: { sort: '{name}: sort' } },
		})

		expect(column.sortAria.get('aria-label')).toBe('Фамилия: sort')
	})

	it('Table.Column: без подписи — одни слова строки', () => {
		const column = new TTableColumn({ field: 'name', sortable: true })

		mount(column, TTableColumnNamesPlugin, ruRU)

		expect(column.sortAria.get('aria-label')).toBe('Сортировать по столбцу')
	})

	it('тост: текст тоста на месте {name}', () => {
		const toast = new TToastsItem({ text: 'Сохранено' })
		const { source } = mount(toast, TToastsItemNamesPlugin, ruRU)

		expect(toast.closeAria.get('aria-label')).toBe('Закрыть Сохранено')

		toast.text = 'Отправлено'

		expect(toast.closeAria.get('aria-label')).toBe('Закрыть Отправлено')

		source.locale = enUS

		expect(toast.closeAria.get('aria-label')).toBe('Close Отправлено')
	})

	it('Input и DateInput: имя поля на месте {name}, следует за name', () => {
		const input = new TInput({ name: 'Город' })
		const date = new TDateInput()

		mount(input, TClearableNamesPlugin, ruRU)
		mount(date, TClearableNamesPlugin)

		expect(input.clearAria.get('aria-label')).toBe('Очистить Город')
		expect(date.clearAria.get('aria-label')).toBe('Clear')

		input.name = 'Улица'

		expect(input.clearAria.get('aria-label')).toBe('Очистить Улица')
	})

	/**
	 * DatePicker — поле, и плагин имён у него один: имя кнопки очистки пишет
	 * его плагин, наследник плагина имён поля, тем же шаблоном.
	 */
	it('DatePicker: кнопка очистки — как у поля, с name DatePicker', () => {
		const picker = new TDatePicker({ name: 'Заезд' })
		const { source } = mount(picker, TDatePickerNamesPlugin)

		expect(picker.clearAria.valueOf()).toEqual({ 'aria-label': 'Clear Заезд' })

		picker.name = 'Выезд'

		expect(picker.clearAria.get('aria-label')).toBe('Clear Выезд')

		source.locale = ruRU

		expect(picker.clearAria.get('aria-label')).toBe('Очистить Выезд')
		expect(picker.triggerAria.get('aria-label')).toBe('Выбрать дату')
	})
})

describe('выходы плагина: имена для вложенных компонентов', () => {
	it('Table: «выбрать все» — выходом selectAll', () => {
		const { source, plugin } = mount(new TTable(), TTableNamesPlugin)
		const changes = vi.fn()

		expect(plugin?.selectAll).toBe('Select all')

		plugin?.events.on('change:selectAll', changes)
		source.locale = ruRU

		expect(plugin?.selectAll).toBe('Выбрать все')
		expect(changes).toHaveBeenCalledExactlyOnceWith('Выбрать все')
	})

	it('DatePicker: имя кнопки — в наборы кнопки и панели, концы — выходами', () => {
		const picker = new TDatePicker()
		const { source, plugin } = mount(picker, TDatePickerNamesPlugin)
		const starts = vi.fn()

		expect(picker.triggerAria.get('aria-label')).toBe('Choose date')
		expect(picker.panelAria.get('aria-label')).toBe('Choose date')
		expect([plugin?.start, plugin?.end]).toEqual(['Start date', 'End date'])

		plugin?.events.on('change:start', starts)
		source.locale = ruRU

		expect(picker.triggerAria.get('aria-label')).toBe('Выбрать дату')
		expect(picker.panelAria.get('aria-label')).toBe('Выбрать дату')
		expect([plugin?.start, plugin?.end]).toEqual(['Дата начала', 'Дата окончания'])
		expect(starts).toHaveBeenCalledExactlyOnceWith('Дата начала')
	})

	it('DatePicker: текст «OK» и «Отмена» подвала — выходами confirm и cancel', () => {
		const { source, plugin } = mount(new TDatePicker(), TDatePickerNamesPlugin)
		const confirms = vi.fn()
		const cancels = vi.fn()

		expect([plugin?.confirm, plugin?.cancel]).toEqual(['OK', 'Cancel'])

		plugin?.events.on('change:confirm', confirms)
		plugin?.events.on('change:cancel', cancels)
		source.locale = ruRU
		// Регион того же языка — те же строки, событий нет
		source.locale = extendLocale(ruRU, { tag: 'ru-BY' })

		expect([plugin?.confirm, plugin?.cancel]).toEqual([
			ruRU.translations.datePicker.confirm,
			ruRU.translations.datePicker.cancel,
		])
		expect(confirms).toHaveBeenCalledExactlyOnceWith(ruRU.translations.datePicker.confirm)
		expect(cancels).toHaveBeenCalledExactlyOnceWith('Отмена')
	})
})

/**
 * Оценка — не кнопка: плагин пишет не имя, а то, как звучит значение поля,
 * `aria-valuetext`. Имя полю даёт подпись или `aria_label`, их плагин не
 * трогает.
 */
describe('значение оценки: rating.value', () => {
	it('оценка и наибольшая — на местах шаблона, числа — по тегу локали', () => {
		const rating = new TRating({ value: 3.5, step: 0.5 })
		const { source } = mount(rating, TRatingNamesPlugin)

		expect(rating.aria.get('aria-valuetext')).toBe('3.5 of 5')
		expect(rating.aria.has('aria-label')).toBe(false)

		source.locale = ruRU

		expect(rating.aria.get('aria-valuetext')).toBe('3,5 из 5')

		source.locale = arEG

		expect(rating.aria.get('aria-valuetext')).toBe('٣٫٥ من ٥')
	})

	it('переписывает на смену оценки и числа звёзд, предпросмотр — нет', () => {
		const rating = new TRating({ value: 2 })

		mount(rating, TRatingNamesPlugin, ruRU)

		rating.value = 4
		expect(rating.aria.get('aria-valuetext')).toBe('4 из 5')

		rating.max = 10
		expect(rating.aria.get('aria-valuetext')).toBe('4 из 10')

		rating.hover(0.9)
		expect(rating.aria.get('aria-valuetext')).toBe('4 из 10')
	})
})

/**
 * Счётчик символов Textarea — не имя, а видимый текст, который рисует
 * библиотека: выходом `counter`. При пределе — шаблон `textarea.counter`,
 * без предела — одно число; числа — по тегу локали.
 */
describe('счётчик Textarea: textarea.counter', () => {
	it('без предела — одно число, цифрами языка', () => {
		const { source, plugin } = mount(new TTextarea({ value: 'abc' }), TTextareaNamesPlugin)

		expect(plugin?.counter).toBe('3')

		source.locale = arEG

		expect(plugin?.counter).toBe((3).toLocaleString('ar-EG'))
	})

	it('с пределом — набранное и предел на местах шаблона, числа — по тегу', () => {
		const textarea = new TTextarea({ value: 'x'.repeat(1234), maxlength: 5000 })
		const { source, plugin } = mount(textarea, TTextareaNamesPlugin)

		expect(plugin?.counter).toBe('1,234 / 5,000')

		source.locale = ruRU

		expect(plugin?.counter).toBe(
			`${(1234).toLocaleString('ru-RU')} / ${(5000).toLocaleString('ru-RU')}`,
		)
	})

	it('шаблон локали — свой порядок слов', () => {
		const custom = extendLocale(enUS, {
			translations: { textarea: { counter: '{max}:{count}' } },
		})
		const { plugin } = mount(
			new TTextarea({ value: 'ab', maxlength: 9 }),
			TTextareaNamesPlugin,
			custom,
		)

		expect(plugin?.counter).toBe('9:2')
	})

	it('набранное считает ядро: перевод строки CR LF — один символ', () => {
		const { plugin } = mount(
			new TTextarea({ value: 'a\r\nb', maxlength: 3 }),
			TTextareaNamesPlugin,
		)

		expect(plugin?.counter).toBe('3 / 3')
	})

	it('переписывает на смену значения и предела; то же — без события', () => {
		const textarea = new TTextarea({ value: 'ab' })
		const { plugin } = mount(textarea, TTextareaNamesPlugin)
		const changes = vi.fn()

		plugin?.events.on('change:counter', changes)

		textarea.value = 'abcd'
		expect(plugin?.counter).toBe('4')

		textarea.maxlength = 10
		expect(plugin?.counter).toBe('4 / 10')

		textarea.maxlength = undefined
		expect(plugin?.counter).toBe('4')

		// Другой текст той же длины — тот же счётчик
		textarea.value = 'wxyz'

		expect(changes.mock.calls).toEqual([['4'], ['4 / 10'], ['4']])
	})
})

describe('жизнь подписок', () => {
	it('после destroy() набора ни смена локали, ни смена текста не пишут', () => {
		const item = new TTabsItem({ text: 'Почта' })
		const { source, bundle } = mount(item, TTabsItemNamesPlugin)

		bundle.destroy()
		source.locale = ruRU
		item.text = 'Настройки'

		expect(item.closeAria.get('aria-label')).toBe('Close Почта')
	})

	/**
	 * Колонку таблица рисует с готовым экземпляром, и экземпляр переживает
	 * заголовок: снятый заголовок имени кнопки больше не пишет.
	 */
	it('колонка: после destroy() набора ни локаль, ни подпись имя кнопки не меняют', () => {
		const column = new TTableColumn({ field: 'name', text: 'Имя', sortable: true })
		const { source, bundle } = mount(column, TTableColumnNamesPlugin)

		bundle.destroy()
		source.locale = ruRU
		column.text = 'Фамилия'

		expect(column.sortAria.get('aria-label')).toBe('Sort by Имя')
	})

	it('оценка: после destroy() набора ни локаль, ни значение строку не меняют', () => {
		const rating = new TRating({ value: 2 })
		const { source, bundle } = mount(rating, TRatingNamesPlugin)

		bundle.destroy()
		source.locale = ruRU
		rating.value = 4

		expect(rating.aria.get('aria-valuetext')).toBe('2 of 5')
	})

	it('счётчик: после destroy() набора ни локаль, ни значение, ни предел его не меняют', () => {
		const textarea = new TTextarea({ value: 'ab' })
		const { source, bundle, plugin } = mount(textarea, TTextareaNamesPlugin)

		bundle.destroy()
		source.locale = arEG
		textarea.value = 'abcd'
		textarea.maxlength = 10

		expect(plugin?.counter).toBe('2')
	})
})
