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
		const col = new TCollectionEngine<Item>({ extensions: {} })

		expect(col.extensions).toEqual({})
		expect(col.getCore().driver.valueOf().length).toBe(0)
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
		expect(plain.insert({ id: 1, name: 'a' })).toEqual({ id: 1, name: 'a' })
	})

	it('расширения могут взаимодействовать через driver', () => {
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		const col = new TCollectionEngine<
			Item,
			{
				plain: TPlainExtension<Item>
				activation: TActivationExtension<Item>
			}
		>({
			extensions: { plain, activation },
		})

		const item: Item = { id: 1, name: 'a' }

		plain.insert(item)
		activation.activate(item)

		expect(col.getCore().driver.valueOf().length).toBe(1)
		expect(activation.activeItem).toBe(item)
	})

	it('batch: делегирует в driver', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		const changeItems = vi.fn()

		col.getCore().driver.events.on('change:items', changeItems)

		col.batch(() => {
			plain.insert({ id: 1, name: 'a' })
			plain.insert({ id: 2, name: 'b' })
		})

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('события driver пробрасываются корректно через расширения', () => {
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		const col = new TCollectionEngine<
			Item,
			{
				plain: TPlainExtension<Item>
				activation: TActivationExtension<Item>
			}
		>({
			extensions: { plain, activation },
		})

		const order: string[] = []

		col.getCore().driver.events.on('item:added', () => order.push('driver:added'))
		col.getCore().driver.events.on('change:count', () => order.push('driver:count'))
		col.getCore().driver.events.on('change:items', () => order.push('driver:items'))
		activation.events.on('change:activation', () => order.push('activation:change'))

		const item: Item = { id: 1, name: 'a' }

		plain.insert(item)
		activation.activate(item)

		expect(order).toEqual(['driver:added', 'driver:count', 'driver:items', 'activation:change'])
	})

	it('можно использовать с кастомным storage', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			storage: undefined, // дефолтный TArrayStorage
			extensions: { plain },
		})

		expect(col.getCore().driver.valueOf().length).toBe(0)
	})

	// --- .use() — дописывает расширение в уже собранный движок ---

	it('use: добавляет расширение после создания', () => {
		const col = new TCollectionEngine<Item>({ extensions: {} })
		const plain = new TPlainExtension<Item>()

		col.use(plain)

		expect(col.getCore().driver.valueOf().length).toBe(0)
		expect(col.extensions.plain).toBe(plain)
	})

	it('use: добавляет несколько расширений', () => {
		const col = new TCollectionEngine<Item>({ extensions: {} })
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()
		const selection = new TSelectionExtension<Item>()

		col.use(plain)
		col.use(activation)
		col.use(selection)

		const item: Item = { id: 1, name: 'a' }

		plain.insert(item)
		activation.activate(item)
		selection.select(item)

		expect(col.extensions.plain).toBe(plain)
		expect(col.extensions.activation).toBe(activation)
		expect(col.extensions.selection).toBe(selection)
		expect(col.getCore().driver.valueOf().length).toBe(1)
		expect(activation.isActive(item)).toBe(true)
		expect(selection.isSelected(item)).toBe(true)
	})

	it('use: install вызывается при добавлении', () => {
		const col = new TCollectionEngine<Item>({ extensions: {} })
		const plain = new TPlainExtension<Item>()

		col.use(plain)

		// plain готов к работе сразу после .use()
		plain.insert({ id: 1, name: 'a' })

		expect(col.getCore().driver.valueOf().length).toBe(1)
	})

	it('use: после добавления extensions — тот же объект', () => {
		const col = new TCollectionEngine<Item>({ extensions: {} })
		const before = col.extensions

		col.use(new TPlainExtension<Item>())

		expect(col.extensions).toBe(before)
	})

	it('use: расширения через конструктор + .use() работают вместе', () => {
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		const col = new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		col.use(activation)

		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		activation.activate(item)

		expect(col.extensions.activation).toBe(activation)
		expect(activation.activeItem).toBe(item)
	})

	it('use: события работают после добавления через .use()', () => {
		const col = new TCollectionEngine<Item>({ extensions: {} })
		const plain = new TPlainExtension<Item>()

		col.use(plain)

		const added = vi.fn()

		col.getCore().driver.events.on('item:added', added)
		plain.insert({ id: 1, name: 'a' })

		expect(added).toHaveBeenCalledOnce()
	})

	it('use: TItemContextRegistry работает с .use() расширениями', () => {
		const col = new TCollectionEngine<Item>({ extensions: {} })
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		col.use(plain)
		col.use(activation)

		// `activation` дописан через `use()` уже после сборки движка, поэтому
		// статически в `TExtensions` движка его нет (см. JSDoc `use()`): движок
		// отдал бы `IExtension<T> | undefined` без `active`. Реестру передаём
		// тот же инстанс `activation` с точным типом — сам реестр рассчитан
		// именно на набор расширений, а не на движок целиком.
		const registry = new TItemContextRegistry<Item, { activation: TActivationExtension<Item> }>(
			{
				driver: col.getCore().driver,
				extensions: { activation },
			},
		)
		const item: Item = { id: 1, name: 'test' }

		plain.insert(item)

		const ctx = registry.get(item)

		expect(ctx.adapters.activation).toBeDefined()
		expect(ctx.adapters.activation.active).toBe(false)

		ctx.adapters.activation.active = true

		expect(activation.isActive(item)).toBe(true)
	})
})
