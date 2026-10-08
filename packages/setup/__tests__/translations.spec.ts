/**
 * Сторож: язык и строки библиотеки задаёт приложение, а не разметка.
 *
 * Строки, которые библиотека рисует сама, — имена кнопок без текста и полей
 * без подписи — компонент берёт из словаря (`translations`), а язык Intl — из
 * `locale`. Оба пишут плагины: словарь — `TTranslationsPlugin`, язык —
 * `TLocalePlugin`, при установке и на каждую смену (`useTranslations`,
 * `useLocale`). Забытый плагин ничего не ломает видимо: компонент молча
 * остаётся на английском. Поэтому сторож идёт по всем дескрипторам экспорта, и
 * новый компонент со словарём или языком попадает под него сам.
 *
 * - записываемого пропа на `Label` нет ни у кого: такая строка — раздел
 *   словаря, а не вход. Имена, которые знает только приложение (`aria_label`,
 *   `thumbLabels`), — не строки библиотеки;
 * - класс со свойством `translations` ставит плагин словаря, с `locale` —
 *   плагин языка, и обратно: плагин стоит только тем, кто читает словарь или
 *   язык;
 * - словаря в разметке нет вовсе, а язык — не вход: своего языка и своих
 *   строк у компонента нет.
 */

import { describe, it, expect } from 'vitest'
import { TLocalePlugin, TTranslationsPlugin } from '@soldy-ui/plugins'
import type { IComponentDescriptor } from '../protected/define'
import { exportedDescriptors } from './helpers'

/** Есть ли у экземпляров класса дескриптора свойство — в цепочке прототипов. */
function classHas(descriptor: IComponentDescriptor, property: string): boolean {
	const prototype: unknown = descriptor.ctor.prototype

	return typeof prototype === 'object' && prototype !== null && property in prototype
}

/** Стоит ли плагин в составе дескриптора — своим или унаследованным определением. */
function installs(descriptor: IComponentDescriptor, ctor: unknown): boolean {
	return descriptor.plugins.some((plugin) => plugin.ctor === ctor)
}

/** Пропсы, которые пишет разметка: свои, унаследованные и плагинов. */
function writableProps(descriptor: IComponentDescriptor): string[] {
	return descriptor
		.getProps()
		.filter((declaration) => !declaration.protected)
		.map((declaration) => declaration.name.getName())
}

const descriptors = exportedDescriptors()

describe('сторож: строки и язык библиотеки — не пропсы', () => {
	it('дескрипторы со словарём и языком найдены в экспорте', () => {
		const names = descriptors.map(([name]) => name)

		expect(names).toEqual(
			expect.arrayContaining([
				'DialogDescriptor',
				'TabsItemDescriptor',
				'CalendarDescriptor',
			]),
		)
	})

	it.each(descriptors)('%s: записываемого пропа на Label нет', (_name, descriptor) => {
		expect(writableProps(descriptor).filter((name) => name.endsWith('Label'))).toEqual([])
	})

	it.each(descriptors)('%s: словаря в разметке нет, язык — не вход', (_name, descriptor) => {
		const props = descriptor.getProps()

		expect(props.filter((declaration) => declaration.name.name === 'translations')).toEqual([])
		expect(writableProps(descriptor)).not.toContain('locale')
	})
})

describe('сторож: словарь и язык компоненту пишет его плагин', () => {
	it.each(descriptors)('%s: свойство translations — плагин словаря', (_name, descriptor) => {
		expect(installs(descriptor, TTranslationsPlugin)).toBe(classHas(descriptor, 'translations'))
	})

	it.each(descriptors)('%s: свойство locale — плагин языка', (_name, descriptor) => {
		expect(installs(descriptor, TLocalePlugin)).toBe(classHas(descriptor, 'locale'))
	})

	it('словарь читают окно и панель, поповер, табы, теги, лента, поля, таблица и даты', () => {
		const translated = descriptors
			.filter(([, descriptor]) => installs(descriptor, TTranslationsPlugin))
			.map(([name]) => name)

		expect(translated).toEqual(
			expect.arrayContaining([
				'ModalLayerDescriptor',
				'DialogDescriptor',
				'DrawerDescriptor',
				'PopoverDescriptor',
				'TabsItemDescriptor',
				'TagsItemDescriptor',
				'TagsDescriptor',
				'ScrollerDescriptor',
				'FieldDescriptor',
				'InputDescriptor',
				'DateInputDescriptor',
				'TableDescriptor',
				'CalendarDescriptor',
				'DatePickerDescriptor',
			]),
		)
		expect(translated).not.toContain('SelectDescriptor')
	})

	it('язык читают календарь, поле даты, DatePicker и таблица — и только они', () => {
		const localized = descriptors
			.filter(([, descriptor]) => installs(descriptor, TLocalePlugin))
			.map(([name]) => name)
			.sort()

		expect(localized).toEqual([
			'CalendarDescriptor',
			'DateInputDescriptor',
			'DatePickerDescriptor',
			'TableDescriptor',
		])
	})
})
