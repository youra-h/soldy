import { describe, it, expect } from 'vitest'
import {
	TCollection,
	TPlainExtension,
	TActivationExtension,
	TSelectionExtension,
	TOrderExtension,
	TItemContextRegistry,
	TBaseOwnerItemExtension,
} from '@soldy/core'
import type {
	IExtension,
	IItemExtension,
	IExtensionItems,
	IBaseOwnerItemExtensionOptions,
	TExtractItemAdapters,
} from '@soldy/core'

// --- Пользовательское расширение для теста ---

type Item = { id: number; name: string }

interface ICustomItemExtension extends IItemExtension<Item> {
	readonly active: boolean
	customAction(): string
}

class TCustomItemExtension implements ICustomItemExtension {
	constructor(
		private readonly _owner: Item,
		private readonly _parent: TCustomExtension,
	) {}

	get active(): boolean {
		return this._parent.isActiveItem(this._owner)
	}

	customAction(): string {
		return `custom:${this._owner.name}`
	}
}

class TCustomExtension
	extends TBaseOwnerItemExtension<Item, ICustomItemExtension, {}>
	implements IExtension<Item>, IExtensionItems<Item, ICustomItemExtension>
{
	readonly name = 'customFeature'

	private _activeItem?: Item

	constructor(options?: IBaseOwnerItemExtensionOptions<Item, ICustomItemExtension>) {
		super(TCustomItemExtension, options)
	}

	isActiveItem(item: Item): boolean {
		return this._activeItem === item
	}

	setActiveItem(item: Item): void {
		this._activeItem = item
	}
}

// --- Helpers ---

type TestExtensions = {
	plain: TPlainExtension<Item>
	activation: TActivationExtension<Item>
	selection: TSelectionExtension<Item>
	order: TOrderExtension<Item>
	customFeature: TCustomExtension
}

function createCollection() {
	return new TCollection<Item, TestExtensions>({
		extensions: {
			plain: new TPlainExtension<Item>(),
			activation: new TActivationExtension<Item>(),
			selection: new TSelectionExtension<Item>(),
			order: new TOrderExtension<Item>(),
			customFeature: new TCustomExtension(),
		},
	})
}

describe('TItemContext + TItemContextRegistry', () => {
	it('registry.get возвращает контекст для элемента', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)
		const ctx = registry.get(item)

		expect(ctx.owner).toBe(item)
	})

	it('registry кеширует контекст (один и тот же объект)', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)

		const ctx1 = registry.get(item)
		const ctx2 = registry.get(item)

		expect(ctx1).toBe(ctx2)
	})

	it('adapters.activation: работает через Proxy', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)

		expect(ctx.adapters.activation).toBeDefined()
		expect(ctx.adapters.activation.active).toBe(false)

		ctx.adapters.activation.active = true

		expect(ctx.adapters.activation.active).toBe(true)
		expect(col.extensions.activation.isActive(item)).toBe(true)
	})

	it('adapters.selection: работает через Proxy', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)

		expect(ctx.adapters.selection.selected).toBe(false)

		ctx.adapters.selection.selected = true

		expect(ctx.adapters.selection.selected).toBe(true)
		expect(col.extensions.selection.isSelected(item)).toBe(true)

		ctx.adapters.selection.toggle()

		expect(ctx.adapters.selection.selected).toBe(false)
	})

	it('adapters.order: возвращает индекс элемента', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a, 0)
		col.extensions.plain.insert(b, 1)

		const ctx = registry.get(a)

		expect(ctx.adapters.order.order).toBe(0)
	})

	it('adapters.customFeature: пользовательское расширение работает', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)
		col.extensions.customFeature.setActiveItem(item)

		const ctx = registry.get(item)

		expect(ctx.adapters.customFeature.active).toBe(true)
		expect(ctx.adapters.customFeature.customAction()).toBe('custom:test')
	})

	it('adapters: кеширует адаптеры (один и тот же объект)', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)
		const a1 = ctx.adapters.activation
		const a2 = ctx.adapters.activation

		expect(a1).toBe(a2)
	})

	it('adapters: plain не имеет createItem — возвращает undefined', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)

		// @ts-expect-error — plain не имеет item-адаптеров
		expect(ctx.adapters.plain).toBeUndefined()
	})

	// --- Типы выводятся корректно (compile-time проверка) ---

	it('TExtractItemAdapters выводит правильные типы', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.extensions)

		// Это проверка на уровне типов:
		// TypeScript должен разрешить все эти обращения
		const item: Item = { id: 1, name: 'test' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)

		// Стандартные адаптеры
		const _activation: boolean = ctx.adapters.activation.active
		const _selected: boolean = ctx.adapters.selection.selected
		const _order: number = ctx.adapters.order.order

		// Пользовательский адаптер
		const _customActive: boolean = ctx.adapters.customFeature.active
		const _customAction: string = ctx.adapters.customFeature.customAction()

		expect(_activation).toBe(false)
		expect(_selected).toBe(false)
		expect(_order).toBeGreaterThanOrEqual(0)
		expect(_customActive).toBe(false)
		expect(_customAction).toBe('custom:test')
	})
})
