/**
 * DragAndDrop — перестановка пользователя командой обёртки.
 *
 * Жест DOM переводит в команду плагин коллекции, а сама перестановка — у
 * обёртки (`move`): событие `move:before`, которое отменяют
 * `preventDefault()`, перемещение в движке и `move` с местом, где элемент
 * встал. Перемещение по-прежнему проходит хук движка `item:move:before`: он
 * подменяет место и отменяет перемещение, и отменённое `move` не шлёт.
 * Элемента, которого взять нельзя (выключен, чужой), того же места и места вне
 * состава команда не трогает — без событий. Правило «можно взять» — у
 * обёртки (`canMove`): по нему плагин решает на `dragstart`.
 *
 * Жест — `plugins/__tests__/collection-elements.plugin.spec.ts`, проводка —
 * `setup/__tests__/adapter.spec.ts`, разметка — `ui/vue/__tests__/drag-and-drop.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { TDragAndDrop, TDragAndDropMoveEvent, TListBox, createEngineListBox } from '@soldy-ui/core'
import type { IDragAndDropMove, TListBoxCollection } from '@soldy-ui/core'

/** Обёртка и список из четырёх элементов. */
function setup() {
	const dnd = new TDragAndDrop()
	const engine = createEngineListBox({
		owner: new TListBox(),
		items: ['a', 'b', 'c', 'd'].map((value) => ({ value, text: value.toUpperCase() })),
	})
	const [a, b, c, d] = engine.extensions.batch.items

	return { dnd, engine, a, b, c, d }
}

/** Порядок значений в составе коллекции. */
const order = (engine: TListBoxCollection) =>
	engine.extensions.batch.items.map((item) => item.value)

/** События обёртки и движка — по порядку прихода. */
function journal(dnd: TDragAndDrop, engine: TListBoxCollection) {
	const names: string[] = []
	const before: TDragAndDropMoveEvent[] = []
	const moved: IDragAndDropMove[] = []

	dnd.events.on('move:before', (e) => {
		names.push('move:before')
		before.push(e)
	})
	dnd.events.on('move', (e) => {
		names.push('move')
		moved.push(e)
	})
	engine.extensions.plain.events.on('item:move:before', () => names.push('item:move:before'))
	engine.extensions.plain.events.on('item:moved', () => names.push('item:moved'))

	return { names, before, moved }
}

describe('TDragAndDrop.move', () => {
	it('переставляет: move:before, перемещение движка, move — с полями перестановки', () => {
		const { dnd, engine, a } = setup()
		const { names, before, moved } = journal(dnd, engine)

		expect(dnd.move(engine, a, 2)).toBe(true)
		expect(order(engine)).toEqual(['b', 'c', 'a', 'd'])
		expect(names).toEqual(['move:before', 'item:move:before', 'item:moved', 'move'])

		const [event] = before

		expect(event).toBeInstanceOf(TDragAndDropMoveEvent)
		expect({
			engine: event.engine,
			item: event.item,
			oldIndex: event.oldIndex,
			newIndex: event.newIndex,
		}).toEqual({ engine, item: a, oldIndex: 0, newIndex: 2 })
		expect(moved).toEqual([{ engine, item: a, oldIndex: 0, newIndex: 2 }])
	})

	it('на каждое перемещение — своя пара событий', () => {
		const { dnd, engine, a } = setup()
		const { names, moved } = journal(dnd, engine)

		dnd.move(engine, a, 1)
		dnd.move(engine, a, 2)
		dnd.move(engine, a, 3)

		expect(order(engine)).toEqual(['b', 'c', 'd', 'a'])
		expect(names.filter((name) => name.startsWith('move'))).toEqual([
			'move:before',
			'move',
			'move:before',
			'move',
			'move:before',
			'move',
		])
		expect(moved.map(({ oldIndex, newIndex }) => [oldIndex, newIndex])).toEqual([
			[0, 1],
			[1, 2],
			[2, 3],
		])
	})

	it('preventDefault() в move:before оставляет элемент на месте: движок не тронут, move нет', () => {
		const { dnd, engine, a } = setup()
		const { names } = journal(dnd, engine)

		dnd.events.on('move:before', (e) => e.preventDefault())

		expect(dnd.move(engine, a, 2)).toBe(false)
		expect(order(engine)).toEqual(['a', 'b', 'c', 'd'])
		expect(names).toEqual(['move:before'])
	})

	it('перемещение, отменённое хуком движка, move не шлёт', () => {
		const { dnd, engine, a } = setup()
		const { names } = journal(dnd, engine)

		engine.extensions.plain.events.on('item:move:before', (e) => e.preventDefault())

		expect(dnd.move(engine, a, 2)).toBe(false)
		expect(order(engine)).toEqual(['a', 'b', 'c', 'd'])
		expect(names).toEqual(['move:before', 'item:move:before'])
	})

	it('хук движка вернул элемент на место — перемещения нет, move нет', () => {
		const { dnd, engine, a } = setup()
		const { moved } = journal(dnd, engine)

		engine.extensions.plain.events.on('item:move:before', (e) => {
			e.newIndex = e.oldIndex
		})

		expect(dnd.move(engine, a, 2)).toBe(false)
		expect(order(engine)).toEqual(['a', 'b', 'c', 'd'])
		expect(moved).toEqual([])
	})

	it('место, подменённое хуком движка, приходит в move фактическим', () => {
		const { dnd, engine, a } = setup()
		const { before, moved } = journal(dnd, engine)

		engine.extensions.plain.events.on('item:move:before', (e) => {
			e.newIndex = 1
		})

		expect(dnd.move(engine, a, 3)).toBe(true)
		expect(order(engine)).toEqual(['b', 'a', 'c', 'd'])
		expect(before.map((e) => e.newIndex)).toEqual([3])
		expect(moved).toEqual([{ engine, item: a, oldIndex: 0, newIndex: 1 }])
	})

	it('выключенный элемент не переставляется — без событий', () => {
		const { dnd, engine, a } = setup()
		const { names } = journal(dnd, engine)

		a.disabled = true

		expect(dnd.move(engine, a, 2)).toBe(false)
		expect(order(engine)).toEqual(['a', 'b', 'c', 'd'])
		expect(names).toEqual([])
	})

	it('мимо выключенного элемента остальные проходят', () => {
		const { dnd, engine, a, b } = setup()

		b.disabled = true

		expect(dnd.move(engine, a, 2)).toBe(true)
		expect(order(engine)).toEqual(['b', 'c', 'a', 'd'])
	})

	it('то же место — без событий', () => {
		const { dnd, engine, b } = setup()
		const { names } = journal(dnd, engine)

		expect(dnd.move(engine, b, 1)).toBe(false)
		expect(names).toEqual([])
	})

	it.each([-1, 4, 1.5, Number.NaN])('место %s вне состава — без событий', (place) => {
		const { dnd, engine, a } = setup()
		const { names } = journal(dnd, engine)

		expect(dnd.move(engine, a, place)).toBe(false)
		expect(order(engine)).toEqual(['a', 'b', 'c', 'd'])
		expect(names).toEqual([])
	})

	it('элемент чужой коллекции — без событий', () => {
		const { dnd, engine } = setup()
		const { names } = journal(dnd, engine)
		const [stranger] = createEngineListBox({ items: [{ value: 'x', text: 'X' }] }).extensions
			.batch.items

		expect(dnd.move(engine, stranger, 0)).toBe(false)
		expect(order(engine)).toEqual(['a', 'b', 'c', 'd'])
		expect(names).toEqual([])
	})
})

describe('TDragAndDrop.canMove', () => {
	it('взять можно элемент своей коллекции, если он не выключен', () => {
		const { dnd, engine, a, b } = setup()
		const [stranger] = createEngineListBox({ items: [{ value: 'x', text: 'X' }] }).extensions
			.batch.items

		b.disabled = true

		expect(dnd.canMove(engine, a)).toBe(true)
		expect(dnd.canMove(engine, b)).toBe(false)
		expect(dnd.canMove(engine, stranger)).toBe(false)
	})

	it('правило одно: наследник, сузивший canMove, сужает и команду', () => {
		const { engine, a, c } = setup()
		const pinned = new Set<object>([a])

		class TPinnedDragAndDrop extends TDragAndDrop {
			override canMove(...[engine, item]: Parameters<TDragAndDrop['canMove']>): boolean {
				return !pinned.has(item) && super.canMove(engine, item)
			}
		}

		const dnd = new TPinnedDragAndDrop()

		expect(dnd.move(engine, a, 2)).toBe(false)
		expect(dnd.move(engine, c, 0)).toBe(true)
		expect(order(engine)).toEqual(['c', 'a', 'b', 'd'])
	})
})
