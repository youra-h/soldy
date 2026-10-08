/**
 * Язык и словарь приложения (`src/locale/`): `useLocale` и `useTranslations`
 * задают их на всю библиотеку, а плагины языка и словаря пишут их компоненту —
 * при установке, синхронно, и на каждую смену, пока жив набор.
 *
 * Хранилище одно на процесс, поэтому после каждого теста язык и словарь
 * возвращаются к английским.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	DEFAULT_LOCALE,
	DEFAULT_TRANSLATIONS,
	TCalendar,
	TDateInput,
	TDialog,
	TTable,
	TTabsItem,
} from '@soldy-ui/core'
import type { TTranslations } from '@soldy-ui/core'
import {
	TLocalePlugin,
	TPluginBundle,
	TTranslationsPlugin,
	useLocale,
	useTranslations,
} from '../src'
import { localeStore } from '../src/locale/store'

afterEach(() => {
	useLocale(DEFAULT_LOCALE)
	useTranslations()
})

/** Текущий словарь приложения — тот, что плагин словаря пишет компонентам. */
function current(): TTranslations {
	return localeStore.translations
}

describe('useTranslations — словарь поверх английского', () => {
	it('без частей — английский, тем же объектом', () => {
		useTranslations({ modal: { close: 'Закрыть' } })
		useTranslations()

		expect(current()).toBe(DEFAULT_TRANSLATIONS)
	})

	it('части ложатся по порядку: поздняя сильнее, чего в ней нет — от ранней', () => {
		useTranslations(
			{ scroller: { prev: 'Назад', next: 'Вперёд' }, table: { selectAll: 'Выбрать все' } },
			{ scroller: { next: 'Дальше' } },
		)

		expect(current().scroller).toEqual({ prev: 'Назад', next: 'Дальше' })
		expect(current().table).toEqual({ selectAll: 'Выбрать все' })
	})

	it('прошлые вызовы не копятся: словарь — то, что передано сейчас', () => {
		useTranslations({ modal: { close: 'Закрыть' } })
		useTranslations({ popover: { close: 'Скрыть' } })

		expect(current().modal).toEqual(DEFAULT_TRANSLATIONS.modal)
		expect(current().popover).toEqual({ close: 'Скрыть' })
	})

	it('чего в частях нет, и ключ со значением undefined — английские', () => {
		useTranslations({ calendar: { prevMonth: 'Назад', nextMonth: undefined } })

		expect(current().calendar).toEqual({ ...DEFAULT_TRANSLATIONS.calendar, prevMonth: 'Назад' })
		expect(current().datePicker).toEqual(DEFAULT_TRANSLATIONS.datePicker)
	})

	it('строка с именем — функция части', () => {
		useTranslations({ tabs: { close: (name) => `Закрыть «${name}»` } })

		expect(current().tabs.close('Почта')).toBe('Закрыть «Почта»')
		expect(current().tags.close('Почта')).toBe('Close Почта')
	})

	it('собранный словарь заморожен вместе с разделами, как английский', () => {
		useTranslations({ modal: { close: 'Закрыть' } })

		expect(Object.isFrozen(current())).toBe(true)
		expect(Object.values(current()).every((section) => Object.isFrozen(section))).toBe(true)
	})

	it('смена — одно change:translations; английский на английском — ничего', () => {
		const changes = vi.fn()

		localeStore.events.on('change:translations', changes)

		useTranslations()

		expect(changes).not.toHaveBeenCalled()

		useTranslations({ modal: { close: 'Закрыть' } })

		expect(changes).toHaveBeenCalledExactlyOnceWith(current())

		localeStore.events.off('change:translations', changes)
	})
})

describe('useLocale', () => {
	it('новый тег — change:locale, тот же тег событий не даёт', () => {
		const changes = vi.fn()

		localeStore.events.on('change:locale', changes)

		useLocale('ru-RU')
		useLocale('ru-RU')
		useLocale(DEFAULT_LOCALE)

		expect(changes.mock.calls).toEqual([['ru-RU'], [DEFAULT_LOCALE]])

		localeStore.events.off('change:locale', changes)
	})
})

describe('плагин языка', () => {
	it('пишет язык при установке — и внешнему ctrl с его своим языком тоже', () => {
		useLocale('ru-RU')

		const table = new TTable({ locale: 'de-DE' })

		new TPluginBundle(table).use(TLocalePlugin)

		expect(table.locale).toBe('ru-RU')
	})

	it('с установки календарь подписан на языке приложения', () => {
		useLocale('ru-RU')

		const calendar = new TCalendar()
		const english = calendar.weekdays.map((day) => day.long)

		new TPluginBundle(calendar).use(TLocalePlugin)

		expect(calendar.weekdays.map((day) => day.long)).not.toEqual(english)
		expect(calendar.firstDay).toBe(1)
	})

	it('смену пишет на лету: одно change:locale у владельца', () => {
		const input = new TDateInput()
		const changes = vi.fn()

		new TPluginBundle(input).use(TLocalePlugin)
		input.events.on('change:locale', changes)

		useLocale('ar-EG')

		expect(input.locale).toBe('ar-EG')
		expect(changes).toHaveBeenCalledExactlyOnceWith('ar-EG')
	})

	it('после destroy() смена до владельца не доходит', () => {
		const table = new TTable()
		const bundle = new TPluginBundle(table).use(TLocalePlugin)

		bundle.destroy()
		useLocale('ru-RU')

		expect(table.locale).toBe(DEFAULT_LOCALE)
	})
})

describe('плагин словаря', () => {
	it('пишет словарь при установке — имена уже на языке приложения', () => {
		useTranslations({ tabs: { close: (name) => `Закрыть «${name}»` } })

		const item = new TTabsItem({ text: 'Почта' })

		new TPluginBundle(item).use(TTranslationsPlugin)

		expect(item.translations).toBe(current())
		expect(item.closeAria['aria-label']).toBe('Закрыть «Почта»')
	})

	it('смену пишет на лету: одно change:translations у владельца', () => {
		const dialog = new TDialog()
		const changes = vi.fn()

		new TPluginBundle(dialog).use(TTranslationsPlugin)
		dialog.events.on('change:translations', changes)

		useTranslations({ modal: { close: 'Закрыть' } })

		expect(dialog.closeAria).toEqual({ 'aria-label': 'Закрыть' })
		expect(changes).toHaveBeenCalledExactlyOnceWith(current())
	})

	it('после destroy() смена до владельца не доходит', () => {
		const dialog = new TDialog()
		const bundle = new TPluginBundle(dialog).use(TTranslationsPlugin)

		bundle.destroy()
		useTranslations({ modal: { close: 'Закрыть' } })

		expect(dialog.translations).toBe(DEFAULT_TRANSLATIONS)
		expect(dialog.closeAria).toEqual({ 'aria-label': 'Close' })
	})

	it('у двух наборов подписки свои: уничтожение одного не снимает другой', () => {
		const first = new TDialog()
		const second = new TDialog()

		new TPluginBundle(first).use(TTranslationsPlugin).destroy()
		new TPluginBundle(second).use(TTranslationsPlugin)

		useTranslations({ modal: { close: 'Закрыть' } })

		expect(first.closeAria).toEqual({ 'aria-label': 'Close' })
		expect(second.closeAria).toEqual({ 'aria-label': 'Закрыть' })
	})
})
