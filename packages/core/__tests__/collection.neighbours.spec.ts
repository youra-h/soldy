import { describe, it, expect } from 'vitest'
import {
	activationOf,
	createEngine,
	createEngineCalendar,
	createEngineListBox,
	createEngineSelect,
	createEngineTabs,
	createEngineTags,
	filterOf,
	listOf,
	plainOf,
	selectOf,
	selectionOf,
	tagsOf,
} from '@soldy-ui/core'
// Одноимённый охранник календаря: в этом файле рядом стандартный `selectionOf`,
// и различает их алиас в импорте
import { selectionOf as calendarSelectionOf } from '../src/components/custom/calendar/collection/extensions/guards'

/**
 * Соседа по коллекции находят охранником контракта, а не приведением типа
 * (docs/agents/collections.md, «Сосед по коллекции — по контракту»): контекст
 * расширения знает соседей только как `IExtension`, а движок к плагину
 * приходит как `TCollectionEngine<any, any>`. Охранник отдаёт расширение,
 * только когда под его именем лежит его контракт, — поэтому переименованный
 * член соседа роняет проверку, а не проходит молча.
 */

describe('охранник отдаёт расширение коллекции, у которой оно есть', () => {
	it('activationOf — активация Tabs', () => {
		const engine = createEngineTabs()

		expect(activationOf(engine)).toBe(engine.extensions.activation)
	})

	it('selectionOf — выбор ListBox', () => {
		const engine = createEngineListBox()

		expect(selectionOf(engine)).toBe(engine.extensions.selection)
	})

	it('filterOf — отбор Select', () => {
		const engine = createEngineSelect()

		expect(filterOf(engine)).toBe(engine.extensions.filter)
	})

	it('plainOf — базовые операции любой коллекции', () => {
		const engine = createEngine()

		expect(plainOf(engine)).toBe(engine.extensions.plain)
	})

	it('selectOf и tagsOf Select — его расширения', () => {
		const engine = createEngineSelect()

		expect(selectOf(engine)).toBe(engine.extensions.select)
		expect(tagsOf(engine)).toBe(engine.extensions.tags)
	})

	it('listOf ListBox — его расширение списка', () => {
		const engine = createEngineListBox()

		expect(listOf(engine)).toBe(engine.extensions.list)
	})

	it('selectionOf календаря — выбор дат', () => {
		const engine = createEngineCalendar()

		expect(calendarSelectionOf(engine)).toBe(engine.extensions.selection)
	})
})

describe('расширения нет — undefined', () => {
	it('у коллекции без него', () => {
		const engine = createEngine()

		expect(activationOf(engine)).toBeUndefined()
		expect(selectionOf(engine)).toBeUndefined()
		expect(filterOf(engine)).toBeUndefined()
		expect(selectOf(createEngineListBox())).toBeUndefined()
		expect(listOf(createEngineSelect())).toBeUndefined()
	})

	it('искать негде — контекста или движка нет', () => {
		expect(selectionOf(undefined)).toBeUndefined()
		expect(plainOf(null)).toBeUndefined()
	})
})

describe('под тем же именем — другой контракт: undefined', () => {
	it('tagsOf Select у Tags: расширение `tags` у Tags своё', () => {
		const engine = createEngineTags()

		expect(engine.extensions.tags).toBeDefined()
		expect(tagsOf(engine)).toBeUndefined()
	})

	it('selectionOf календаря у ListBox: `selection` — стандартный выбор элементов', () => {
		const engine = createEngineListBox()

		expect(engine.extensions.selection).toBeDefined()
		expect(calendarSelectionOf(engine)).toBeUndefined()
	})

	it('стандартный selectionOf у календаря: `selection` выбирает даты, а не элементы', () => {
		const engine = createEngineCalendar()

		expect(engine.extensions.selection).toBeDefined()
		expect(selectionOf(engine)).toBeUndefined()
	})
})
