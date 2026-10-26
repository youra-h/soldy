/**
 * A collection item that has never been drawn holds one bus — its own
 * `events` — and at most one emitter on it, for the collection that listens
 * to the item.
 *
 * Under the `Virtual` window most items of a large list are never drawn: no
 * row, no DOM node, no item adapter. What such an item weighs is the price of
 * every element of the data. Each attribute set (`classes`, `aria`, `dataset`,
 * `attrs`, a table row's `headerAria`) used to have a bus of its own with its
 * owner subscribed to it, and the item subscribed to its own `change:disabled`,
 * `change:tag` and `change:direction`: five emitters per item, about 2 KB, of
 * which three lists of 1000 items held 6 MB on the components page
 * (benchmarks/pages, `virtual`). Now a set reports to its owner, subscribed
 * with `subscribe` (`TSubscribable`), and the setters recompute what depends on
 * the property — the item keeps no emitter of its own.
 *
 * What is left on the item's bus is the collection's subscription: the content
 * fit of a ListBox item, the text of a Select option, the disabled state of a
 * table row. All of them share the one emitter of that bus.
 *
 * `queryObjects` from `node:v8` collects garbage itself and counts the
 * reachable instances of a class (see `ui/vue/__tests__/virtual-rows.spec.ts`).
 * The counters are global to the worker, so the spec counts the difference: a
 * bare item — against nothing, a collection — `2N` items against `N`, which
 * cancels what the collection itself holds.
 */

import { describe, it, expect } from 'vitest'
import { queryObjects } from 'node:v8'
import {
	TEvented,
	TEventEmitter,
	TListBox,
	TListBoxItem,
	TSelect,
	TSelectItem,
	TTable,
	TTableRow,
	createEngineListBox,
	createEngineSelect,
	createEngineTable,
} from '@soldy-ui/core'

/** Items per measurement; the larger collection holds twice as many. */
const COUNT = 200

/** Live buses and emitters right now. */
function census(): { buses: number; emitters: number } {
	return {
		buses: queryObjects(TEvented, { format: 'count' }),
		emitters: queryObjects(TEventEmitter, { format: 'count' }),
	}
}

/**
 * How many buses and emitters `build` adds while what it returns is alive.
 * The result is held until after the second count.
 */
function added(build: () => unknown): { buses: number; emitters: number } {
	const before = census()
	const held = build()
	const after = census()

	expect(held).toBeDefined()

	return { buses: after.buses - before.buses, emitters: after.emitters - before.emitters }
}

/** A bare item: created outside any collection. */
type TBareCase = { name: string; create(): object }

const bareCases: TBareCase[] = [
	{ name: 'TListBoxItem', create: () => new TListBoxItem({ value: 'v', text: 'Item' }) },
	{ name: 'TSelectItem', create: () => new TSelectItem({ value: 'v', text: 'Option' }) },
	{ name: 'TTableRow', create: () => new TTableRow({ data: { id: 1 } }) },
]

describe.each(bareCases)('$name · голый элемент', ({ create }) => {
	it('одна шина — своя, и ни одного эмиттера', () => {
		const { buses, emitters } = added(() => Array.from({ length: COUNT }, create))

		expect(buses).toBe(COUNT)
		expect(emitters).toBe(0)
	})
})

/** Value sources of `count` items: `v0`, `v1`, … */
function sources(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		value: `v${index}`,
		text: `Item ${index}`,
	}))
}

/** A filled collection: the engine with its owner, held by the result. */
type TCase = { name: string; fill(count: number): unknown }

const cases: TCase[] = [
	{
		name: 'ListBox',
		fill: (count) => {
			const engine = createEngineListBox({ owner: new TListBox() })

			engine.extensions.batch.set(sources(count))

			return engine
		},
	},
	{
		name: 'Select',
		fill: (count) => {
			const engine = createEngineSelect({ owner: new TSelect() })

			engine.extensions.batch.set(sources(count))

			return engine
		},
	},
	{
		name: 'Table',
		fill: (count) => {
			const engine = createEngineTable({ owner: new TTable() })

			engine.extensions.batch.set(sources(count).map((data) => ({ data })))

			return engine
		},
	},
]

describe.each(cases)('$name · элемент, который ни разу не рисовался', ({ fill }) => {
	it('на элемент — одна шина и не больше одного эмиттера', () => {
		const once = added(() => fill(COUNT))
		const twice = added(() => fill(2 * COUNT))

		expect(twice.buses - once.buses).toBe(COUNT)
		expect(twice.emitters - once.emitters).toBeLessThanOrEqual(COUNT)
	})
})
