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
	TPopover,
	TScroller,
	TTable,
	TTabsItem,
	TTagsItem,
} from '@soldy-ui/core'
import {
	TDatePickerNamesPlugin,
	TDialogNamesPlugin,
	TFieldNamesPlugin,
	TLocaleSource,
	TModalNamesPlugin,
	TPluginBundle,
	TPopoverNamesPlugin,
	TScrollerNamesPlugin,
	TTableNamesPlugin,
	TTabsItemNamesPlugin,
	TTagsItemNamesPlugin,
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

	it('Input и DateInput: имя поля на месте {name}, следует за name', () => {
		const input = new TInput({ name: 'Город' })
		const date = new TDateInput()

		mount(input, TFieldNamesPlugin, ruRU)
		mount(date, TFieldNamesPlugin)

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

describe('жизнь подписок', () => {
	it('после destroy() набора ни смена локали, ни смена текста не пишут', () => {
		const item = new TTabsItem({ text: 'Почта' })
		const { source, bundle } = mount(item, TTabsItemNamesPlugin)

		bundle.destroy()
		source.locale = ruRU
		item.text = 'Настройки'

		expect(item.closeAria.get('aria-label')).toBe('Close Почта')
	})
})
