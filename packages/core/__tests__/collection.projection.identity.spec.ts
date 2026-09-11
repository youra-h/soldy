/**
 * Канонизация — `driver.canonical()` и вход, который её использует.
 *
 * Проектор волен подменить представление элемента (Proxy-обёртка), но
 * `selection`/`activation`/реестр контекстов держат элемент по ссылке. Без
 * канонизации `select(proxy)` не находил бы себя в driver и молча ничего не
 * делал бы. `link()` — единственный способ сообщить driver'у, что новая
 * ссылка представляет старую; без вызова `canonical(x)` — тождество.
 */

import { describe, it, expect } from 'vitest'
import {
	TCollectionEngine,
	TBatchExtension,
	TSelectionExtension,
	TActivationExtension,
	TItemContextRegistry,
} from '@soldy/core'
import type { IProjectionContext } from '@soldy/core'

type Item = { id: number; name: string }

/** Прозрачная обёртка, которая ничего не подменяет — только регистрирует связь. */
function wrap(items: readonly Item[], ctx: IProjectionContext<Item>): readonly Item[] {
	return items.map((source) => {
		const proxy = new Proxy(source, {
			get: (target, prop, receiver) => Reflect.get(target, prop, receiver),
		})

		ctx.link(proxy, source)

		return proxy
	})
}

function createSelectionCollection() {
	const batch = new TBatchExtension<Item>()
	const selection = new TSelectionExtension<Item>()

	return new TCollectionEngine<
		Item,
		{ batch: TBatchExtension<Item>; selection: TSelectionExtension<Item> }
	>({ extensions: { batch, selection } })
}

describe('canonical — без link()', () => {
	it('canonical(x) === x', () => {
		const col = createSelectionCollection()
		const item = { id: 1, name: 'a' }

		col.extensions.batch.set([item])
		col.driver.projectors.use((list) => list.filter(() => true))

		void col.driver.projection

		expect(col.driver.canonical(item)).toBe(item)
	})
})

describe('canonical — Proxy-проектор', () => {
	it('canonical(proxy) === source', () => {
		const col = createSelectionCollection()
		const item = { id: 1, name: 'a' }

		col.extensions.batch.set([item])
		col.driver.projectors.use(wrap)

		const projected = col.driver.projection[0]

		expect(projected).not.toBe(item)
		expect(col.driver.canonical(projected)).toBe(item)
	})

	it('транзитивно через два проектора (filter → map)', () => {
		const col = createSelectionCollection()
		const a = { id: 1, name: 'a' }
		const b = { id: 2, name: 'b' }

		col.extensions.batch.set([a, b])
		col.driver.projectors.use((list) => list.filter((item) => item.id === 1))
		col.driver.projectors.use(wrap)

		const projected = col.driver.projection[0]

		expect(col.driver.canonical(projected)).toBe(a)
	})
})

describe('канонизация на входе — selection', () => {
	it('select(proxy) выбирает исходный, isSelected(proxy) === true, deselect(proxy) снимает', () => {
		const col = createSelectionCollection()
		const a = { id: 1, name: 'a' }

		col.extensions.batch.set([a])
		col.driver.projectors.use(wrap)

		const proxy = col.driver.projection[0]

		col.extensions.selection.select(proxy)

		expect(col.extensions.selection.selected).toEqual([a])
		expect(col.extensions.selection.isSelected(proxy)).toBe(true)
		expect(col.extensions.selection.isSelected(a)).toBe(true)

		col.extensions.selection.deselect(proxy)

		expect(col.extensions.selection.selected).toEqual([])
	})

	it('toggle(proxy) переключает исходный', () => {
		const col = createSelectionCollection()
		const a = { id: 1, name: 'a' }

		col.extensions.batch.set([a])
		col.driver.projectors.use(wrap)

		const proxy = col.driver.projection[0]

		col.extensions.selection.toggle(proxy)
		expect(col.extensions.selection.selected).toEqual([a])

		col.extensions.selection.toggle(proxy)
		expect(col.extensions.selection.selected).toEqual([])
	})
})

describe('канонизация на входе — реестр контекстов элементов', () => {
	it('registry.get(proxy) === registry.get(source) — адаптеры не дублируются', () => {
		const col = createSelectionCollection()
		const a = { id: 1, name: 'a' }

		col.extensions.batch.set([a])
		col.driver.projectors.use(wrap)

		const proxy = col.driver.projection[0]
		const registry = new TItemContextRegistry(col.getCore())

		expect(registry.get(proxy)).toBe(registry.get(a))
	})
})

describe('канонизация на входе — активация', () => {
	it('activate(proxy) активирует исходный', () => {
		const batch = new TBatchExtension<Item>()
		const activation = new TActivationExtension<Item>()
		const col = new TCollectionEngine<
			Item,
			{ batch: TBatchExtension<Item>; activation: TActivationExtension<Item> }
		>({ extensions: { batch, activation } })

		const a = { id: 1, name: 'a' }

		col.extensions.batch.set([a])
		col.driver.projectors.use(wrap)

		const proxy = col.driver.projection[0]

		col.extensions.activation.activate(proxy)

		expect(col.extensions.activation.activeItem).toBe(a)
	})
})
