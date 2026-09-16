/**
 * Манифест стенда не должен расходиться с компонентами.
 *
 * Описания пропов живут не в контракте, а здесь — значит библиотека может
 * уехать вперёд молча. Прежнее демо так и сгнило: панели свойств были написаны
 * руками, компоненты обросли пропами, и стенд годами показывал не то.
 *
 * Проверка идёт от дескрипторов к манифесту, а не наоборот: источник истины —
 * компонент.
 */

import { describe, it, expect } from 'vitest'
import { COMPONENTS } from '../src/registry'
import { describeProp, optionsForProp, PRESETS, propControls } from '../src/props'
import type { TPropControl } from '../src/types'

/**
 * Строки, которые стенд показывает, — все группы страницы.
 *
 * Считает их та же `propControls`, что строит страницу: своя копия фильтра
 * здесь расходилась бы со страницей молча, а с плагинными пропами разошлась бы
 * наверняка. Все группы, а не одна: пока проверка смотрела только компонентный
 * дескриптор, описания для `mode` с фасада коллекции никто не требовал — а
 * страница его и не показывала.
 */
function editableControls(entry: (typeof COMPONENTS)[number]): TPropControl[] {
	return Object.values(propControls(entry)).flat()
}

describe('манифест покрывает контракт', () => {
	it.each(COMPONENTS.map((entry) => [entry.id, entry] as const))(
		'%s: у каждого редактируемого пропа есть описание',
		(_id, entry) => {
			const missing = editableControls(entry)
				.map((control) => control.name)
				.filter((name) => !describeProp(entry.id, name))

			expect(missing).toEqual([])
		},
	)

	/**
	 * Select без списка значений — пустой выпадающий список. Проверяем, что
	 * контрол и данные согласованы, а не по отдельности правдоподобны.
	 */
	it.each(COMPONENTS.map((entry) => [entry.id, entry] as const))(
		'%s: у каждого select-пропа есть непустой список значений',
		(_id, entry) => {
			const broken = editableControls(entry)
				.filter((control) => control.kind === 'select')
				.map((control) => control.name)
				.filter((name) => !optionsForProp(entry.id, name)?.length)

			expect(broken).toEqual([])
		},
	)
})

/**
 * Пресеты строк ссылаются на пропы по имени, как и описания. Переименуй
 * `removeOnBackspace` или `mode` в компоненте — и строка молча перестала бы
 * выставлять то, без чего её проп не виден: ошибки нет, переключатель есть,
 * эффекта нет.
 */
describe('пресеты строк', () => {
	it.each(Object.entries(PRESETS))('%s: пресеты ссылаются на настоящие пропы', (id, rows) => {
		const entry = COMPONENTS.find((candidate) => candidate.id === id)

		if (!entry) throw new Error(`нет компонента «${id}»`)

		const names = new Set(editableControls(entry).map((control) => control.name))
		const broken: string[] = []

		for (const [row, preset] of Object.entries(rows)) {
			if (!names.has(row)) broken.push(`строка ${row}`)

			for (const [name, value] of Object.entries(preset)) {
				if (!names.has(name)) {
					broken.push(`${row} → ${name}`)
					continue
				}

				// Значение перечислимого пропа — из его же списка, иначе пресет
				// выставил бы то, чего компонент не знает
				const options = optionsForProp(id, name)

				if (options && !options.includes(value as string)) {
					broken.push(`${row} → ${name}=${String(value)}`)
				}
			}
		}

		expect(broken).toEqual([])
	})
})

describe('реестр', () => {
	it('идентификаторы уникальны — по ним строится маршрут', () => {
		const ids = COMPONENTS.map((entry) => entry.id)

		expect(new Set(ids).size).toBe(ids.length)
	})

	it('каждый дескриптор собирается и отдаёт ctor', () => {
		for (const entry of COMPONENTS) {
			expect(entry.descriptor().ctor, entry.id).toBeTypeOf('function')
		}
	})
})
