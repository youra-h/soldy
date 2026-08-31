import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TActivationExtension,
	TSelectionExtension,
	TItemContextRegistry,
} from '@soldy/core'

type Item = { id: number; name: string }

describe('TCollectionEngine', () => {
	it('создаётся без расширений', () => {
		const col = new TCollectionEngine<Item>()

		expect(col.extensions).toEqual({})
		expect(col.driver.length).toBe(0)
	})

	it('создаётся с расширениями', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		expect(col.extensions.plain).toBe(plain)
	})

	it('расширения устанавливаются (install вызывается)', () => {
		const plain = new TPlainExtension<Item>()

		new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		// plain должен иметь доступ к driver через _ctx
		expect(plain.length).toBe(0)
	})

	it('расширения могут взаимодействовать через driver', () => {
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		const col = new TCollectionEngine<Item, {
			plain: TPlainExtension<Item>
			activation: TActivationExtension<Item>
		}>({
			extensions: { plain, activation },
		})

		const item: Item = { id: 1, name: 'a' }

		plain.insert(item)
		activation.activate(item)

		expect(col.driver.length).toBe(1)
		expect(activation.activeItem).toBe(item)
	})

	it('batch: делегирует в driver', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		const changeItems = vi.fn()

		col.driver.events.on('change:items', changeItems)

		col.batch(() => {
			plain.insert({ id: 1, name: 'a' })
			plain.insert({ id: 2, name: 'b' })
		})

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('события driver пробрасываются корректно через расширения', () => {
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		const col = new TCollectionEngine<Item, {
			plain: TPlainExtension<Item>
			activation: TActivationExtension<Item>
		}>({
			extensions: { plain, activation },
		})

		const order: string[] = []

		col.driver.events.on('item:added', () => order.push('driver:added'))
		col.driver.events.on('change:count', () => order.push('driver:count'))
		col.driver.events.on('change:items', () => order.push('driver:items'))
		activation.events.on('change:activation', () => order.push('activation:change'))

		const item: Item = { id: 1, name: 'a' }

		plain.insert(item)
		activation.activate(item)

		expect(order).toEqual([
			'driver:added',
			'driver:count',
			'driver:items',
			'activation:change',
		])
	})

	it('можно использовать с кастомным storage', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			storage: undefined, // дефолтный TArrayStorage
			extensions: { plain },
		})

		expect(col.driver.length).toBe(0)
	})

	// --- .use() — fluent-добавление расширений ---

	it('use: добавляет расширение после создания', () => {
		const col = new TCollectionEngine<Item>()
			.use(new TPlainExtension<Item>())

		expect(col.driver.length).toBe(0)
		expect(col.extensions.plain).toBeDefined()
	})

	it('use: цепочка добавляет несколько расширений с сохранением типов', () => {
		const col = new TCollectionEngine<Item>()
			.use(new TPlainExtension<Item>())
			.use(new TActivationExtension<Item>())
			.use(new TSelectionExtension<Item>())

		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)
		col.extensions.selection.select(item)

		expect(col.driver.length).toBe(1)
		expect(col.extensions.activation.isActive(item)).toBe(true)
		expect(col.extensions.selection.isSelected(item)).toBe(true)
	})

	it('use: install вызывается при добавлении', () => {
		const col = new TCollectionEngine<Item>()
			.use(new TPlainExtension<Item>())

		// plain готов к работе сразу после .use()
		col.extensions.plain.insert({ id: 1, name: 'a' })

		expect(col.driver.length).toBe(1)
	})

	it('use: возвращает this (тот же объект)', () => {
		const col = new TCollectionEngine<Item>()

		const result = col.use(new TPlainExtension<Item>())

		expect(result).toBe(col)
	})

	it('use: расширения через конструктор + .use() работают вместе', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		}).use(new TActivationExtension<Item>())

		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)

		expect(col.extensions.activation.activeItem).toBe(item)
	})

	it('use: события работают после добавления через .use()', () => {
		const col = new TCollectionEngine<Item>()
			.use(new TPlainExtension<Item>())

		const added = vi.fn()

		col.driver.events.on('item:added', added)
		col.extensions.plain.insert({ id: 1, name: 'a' })

		expect(added).toHaveBeenCalledOnce()
	})

	it('use: TItemContextRegistry работает с .use() расширениями', () => {
		const col = new TCollectionEngine<Item>()
			.use(new TPlainExtension<Item>())
			.use(new TActivationExtension<Item>())

		const registry = new TItemContextRegistry(col.getCore())
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)

		expect(ctx.adapters.activation).toBeDefined()
		expect(ctx.adapters.activation.active).toBe(false)

		ctx.adapters.activation.active = true

		expect(col.extensions.activation.isActive(item)).toBe(true)
	})
})
