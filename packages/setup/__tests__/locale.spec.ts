/**
 * Сторож: язык и строки библиотеки — от локали поддерева, а не от разметки.
 *
 * Локаль приходит сборке опцией `locale` (источник провайдера адаптера) и
 * уходит набору плагинов, как id монтирования. Тег пишет компоненту
 * `TLocalePlugin`, имена кнопок — плагин имён компонента (`TNamesPlugin`).
 * Ядро имён не строит, поэтому забытый плагин имён оставляет кнопку
 * безымянной — молча. Сторож собирает каждый дескриптор, у которого есть
 * кнопки с именами, на русской локали и проверяет имена в выходах, а потом —
 * смену на лету.
 *
 * - записываемого пропа на `Label` нет ни у кого: такая строка — строка
 *   локали, а не вход. Имена, которые знает только приложение (`aria_label`,
 *   `thumbLabels`), — не строки библиотеки;
 * - язык — не вход, и плагин языка стоит ровно у классов со свойством
 *   `locale`;
 * - плагин имён стоит ровно у дескрипторов таблицы ниже: новый компонент с
 *   именами кнопок обязан в неё попасть.
 */

import { describe, it, expect } from 'vitest'
import {
	TLocalePlugin,
	TLocaleSource,
	TNamesPlugin,
	enUS,
	formatName,
	ruRU,
} from '@soldy-ui/plugins'
import type { TLocale } from '@soldy-ui/plugins'
import { createAdapterContext } from '../protected/adapter'
import type { IComponentDescriptor } from '../protected/define'
import { CallbackProfile, exportedDescriptors } from './helpers'

/** Есть ли у экземпляров класса дескриптора свойство — в цепочке прототипов. */
function classHas(descriptor: IComponentDescriptor, property: string): boolean {
	const prototype: unknown = descriptor.ctor.prototype

	return typeof prototype === 'object' && prototype !== null && property in prototype
}

/** Стоит ли плагин в составе дескриптора — сам или наследником. */
function installs(descriptor: IComponentDescriptor, base: abstract new () => unknown): boolean {
	return descriptor.plugins.some((plugin) => plugin.ctor.prototype instanceof base)
}

/** Пропсы, которые пишет разметка: свои, унаследованные и плагинов. */
function writableProps(descriptor: IComponentDescriptor): string[] {
	return descriptor
		.getProps()
		.filter((declaration) => !declaration.protected)
		.map((declaration) => declaration.name.getName())
}

/** Имя в выходе: у набора — его `aria-label`, у строки — она сама. */
function nameIn(value: unknown): unknown {
	if (typeof value === 'object' && value !== null) return Reflect.get(value, 'aria-label')

	return value
}

/**
 * Выходы с именами по дескрипторам: имя выхода во фреймворке → строка
 * локали. Части без текста и полей без имени — по умолчанию сборки: имя части
 * пустое.
 */
const NAMED: Record<string, Record<string, (locale: TLocale) => string>> = {
	DialogDescriptor: {
		closeAria: ({ translations }) => translations.modal.close,
		maximizeAria: ({ translations }) => translations.dialog.maximize,
	},
	DrawerDescriptor: { closeAria: ({ translations }) => translations.modal.close },
	PopoverDescriptor: { closeAria: ({ translations }) => translations.popover.close },
	TabsItemDescriptor: {
		closeAria: ({ translations }) => formatName(translations.tabs.close, ''),
	},
	TagsItemDescriptor: {
		closeAria: ({ translations }) => formatName(translations.tags.close, ''),
	},
	TagsDescriptor: {
		moreAria: ({ translations }) => translations.tags.more,
		names_more: ({ translations }) => translations.tags.more,
	},
	ScrollerDescriptor: {
		prevAria: ({ translations }) => translations.scroller.prev,
		nextAria: ({ translations }) => translations.scroller.next,
	},
	// Базе поля (`FieldDescriptor`) плагин имён не ставится, как модальному слою:
	// он один на компонент, и у DatePicker кнопок с именами больше
	InputDescriptor: { clearAria: ({ translations }) => formatName(translations.field.clear, '') },
	DateInputDescriptor: {
		clearAria: ({ translations }) => formatName(translations.field.clear, ''),
	},
	TableDescriptor: { names_selectAll: ({ translations }) => translations.table.selectAll },
	CalendarDescriptor: {
		prevAria: ({ translations }) => translations.calendar.prevMonth,
		nextAria: ({ translations }) => translations.calendar.nextMonth,
	},
	DatePickerDescriptor: {
		clearAria: ({ translations }) => formatName(translations.field.clear, ''),
		triggerAria: ({ translations }) => translations.datePicker.trigger,
		panelAria: ({ translations }) => translations.datePicker.trigger,
		names_start: ({ translations }) => translations.datePicker.start,
		names_end: ({ translations }) => translations.datePicker.end,
		names_confirm: ({ translations }) => translations.datePicker.confirm,
		names_cancel: ({ translations }) => translations.datePicker.cancel,
	},
}

const descriptors = exportedDescriptors()

/** Дескриптор из экспорта по имени. */
function descriptorOf(name: string): IComponentDescriptor {
	const found = descriptors.find(([exported]) => exported === name)

	if (!found) throw new Error(`${name} нет в экспорте`)

	return found[1]
}

/** Собранный на локали компонент и его состояние — как у адаптера с подпиской. */
function assemble(name: string, locale?: TLocaleSource) {
	const adapter = createAdapterContext(descriptorOf(name), { props: {}, locale })
	const state: Record<string, unknown> = {}
	const off = adapter.connect(CallbackProfile).state.subscribe((key, value) => {
		state[key] = value
	})

	return { adapter, state, off }
}

/** Имена из выходов собранного компонента. */
function namesOf(name: string, state: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.keys(NAMED[name] ?? {}).map((key) => [key, nameIn(state[key])]),
	)
}

/** Ожидаемые имена дескриптора на локали. */
function expected(name: string, locale: TLocale): Record<string, string> {
	return Object.fromEntries(
		Object.entries(NAMED[name] ?? {}).map(([key, string]) => [key, string(locale)]),
	)
}

describe('сторож: строки и язык библиотеки — не пропсы', () => {
	it.each(descriptors)('%s: записываемого пропа на Label нет', (_name, descriptor) => {
		expect(writableProps(descriptor).filter((name) => name.endsWith('Label'))).toEqual([])
	})

	it.each(descriptors)('%s: строк в разметке нет, язык — не вход', (_name, descriptor) => {
		const props = descriptor.getProps().map((declaration) => declaration.name.name)

		expect(props).not.toContain('translations')
		expect(writableProps(descriptor)).not.toContain('locale')
	})
})

describe('сторож: язык и имена компоненту пишут его плагины', () => {
	it.each(descriptors)('%s: свойство locale — плагин языка', (_name, descriptor) => {
		expect(descriptor.plugins.some((plugin) => plugin.ctor === TLocalePlugin)).toBe(
			classHas(descriptor, 'locale'),
		)
	})

	it('плагин имён — ровно у дескрипторов с именами кнопок', () => {
		const named = descriptors
			.filter(([, descriptor]) => installs(descriptor, TNamesPlugin))
			.map(([name]) => name)
			.sort()

		expect(named).toEqual(Object.keys(NAMED).sort())
	})

	it.each(Object.keys(NAMED))('%s: имена от локали поддерева — с первой сборки', (name) => {
		const { adapter, state, off } = assemble(name, new TLocaleSource(ruRU))

		expect(namesOf(name, state)).toEqual(expected(name, ruRU))

		off()
		adapter.destroy()
	})

	it.each(Object.keys(NAMED))('%s: смена локали — новые имена на лету', (name) => {
		const source = new TLocaleSource(ruRU)
		const { adapter, state, off } = assemble(name, source)

		source.locale = enUS

		expect(namesOf(name, state)).toEqual(expected(name, enUS))

		off()
		adapter.destroy()
	})

	it.each(Object.keys(NAMED))('%s: без провайдера — английские', (name) => {
		const { adapter, state, off } = assemble(name)

		expect(namesOf(name, state)).toEqual(expected(name, enUS))

		off()
		adapter.destroy()
	})

	it('тег локали — компонентам с языком, на лету', () => {
		const source = new TLocaleSource(ruRU)
		const { adapter, off } = assemble('CalendarDescriptor', source)

		expect(Reflect.get(adapter.instance, 'locale')).toBe('ru-RU')

		source.locale = enUS

		expect(Reflect.get(adapter.instance, 'locale')).toBe('en-US')

		off()
		adapter.destroy()
	})
})
