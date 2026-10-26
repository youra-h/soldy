/**
 * A collection item that has never been drawn holds one bus — its own
 * `events` — and at most one emitter on it, for the collection that listens
 * to the item, and not a single `Map` or `Set`.
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
 * The sets keep their entries in arrays of exact length, not in a `Map` or a
 * `Set` (`TAttributes`, `TClasses`): a map gets its hash table with room for
 * four entries from the first one, and the two to four entries of an item's
 * set cost less than half of it in an array. So the census counts maps and
 * sets too: one per item would mean a set went back to a hash table.
 *
 * `queryObjects` from `node:v8` collects garbage itself and counts the
 * reachable instances of a class (see `ui/vue/__tests__/virtual-rows.spec.ts`).
 * The counters are global to the worker, so the spec counts the difference —
 * `2N` items against `N`: for a collection it cancels what the collection
 * itself holds, and for a bare item what the first instances create once,
 * like the lazy caches of the modules.
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

/** Items per measurement; the larger set of items holds twice as many. */
const COUNT = 200

/** What the census counts. */
type TCensus = { buses: number; emitters: number; maps: number; sets: number }

/** Live buses, emitters, maps and sets right now. */
function census(): TCensus {
	return {
		buses: queryObjects(TEvented, { format: 'count' }),
		emitters: queryObjects(TEventEmitter, { format: 'count' }),
		maps: queryObjects(Map, { format: 'count' }),
		sets: queryObjects(Set, { format: 'count' }),
	}
}

/**
 * How many buses, emitters, maps and sets `build` adds while what it returns
 * is alive. The result is held until after the second count.
 */
function added(build: () => unknown): TCensus {
	const before = census()
	const held = build()
	const after = census()

	expect(held).toBeDefined()

	return {
		buses: after.buses - before.buses,
		emitters: after.emitters - before.emitters,
		maps: after.maps - before.maps,
		sets: after.sets - before.sets,
	}
}

/** What `2N` items add over `N`: the price of `N` items. */
function perCount(build: (count: number) => unknown): TCensus {
	const once = added(() => build(COUNT))
	const twice = added(() => build(2 * COUNT))

	return {
		buses: twice.buses - once.buses,
		emitters: twice.emitters - once.emitters,
		maps: twice.maps - once.maps,
		sets: twice.sets - once.sets,
	}
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
		const { buses, emitters } = perCount((count) => Array.from({ length: count }, create))

		expect(buses).toBe(COUNT)
		expect(emitters).toBe(0)
	})

	it('ни одной карты и ни одного множества: наборы держат записи массивами', () => {
		const { maps, sets } = perCount((count) => Array.from({ length: count }, create))

		expect(maps).toBe(0)
		expect(sets).toBe(0)
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
		const { buses, emitters } = perCount(fill)

		expect(buses).toBe(COUNT)
		expect(emitters).toBeLessThanOrEqual(COUNT)
	})

	it('ни одной карты и ни одного множества на элемент', () => {
		const { maps, sets } = perCount(fill)

		expect(maps).toBe(0)
		expect(sets).toBe(0)
	})
})
