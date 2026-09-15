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
import { describeProp, optionsForProp, controlKind, NON_EDITABLE, PRESETS } from '../src/props'

/**
 * Пропы, которые стенд показывает как редактируемые.
 *
 * Оба дескриптора, а не один: `mode` объявлен на фасаде коллекции, и пока
 * проверка смотрела только компонентный, описания для него никто не требовал —
 * а страница его и не показывала.
 */
function editableProps(entry: (typeof COMPONENTS)[number]) {
	const declarations = [...entry.descriptor().props, ...(entry.collectionDescriptor?.().props ?? [])]

	return declarations.filter((prop) => !prop.protected && !NON_EDITABLE.has(prop.name.name))
}

describe('манифест покрывает контракт', () => {
	it.each(COMPONENTS.map((entry) => [entry.id, entry] as const))(
		'%s: у каждого редактируемого пропа есть описание',
		(_id, entry) => {
			const missing = editableProps(entry)
				.map((prop) => prop.name.name)
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
			const broken = editableProps(entry)
				.filter((prop) => controlKind(entry.id, prop) === 'select')
				.filter((prop) => !optionsForProp(entry.id, prop.name.name)?.length)
				.map((prop) => prop.name.name)

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

		const props = new Map(editableProps(entry).map((prop) => [prop.name.name, prop]))
		const broken: string[] = []

		for (const [row, preset] of Object.entries(rows)) {
			if (!props.has(row)) broken.push(`строка ${row}`)

			for (const [name, value] of Object.entries(preset)) {
				const prop = props.get(name)

				if (!prop) {
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
