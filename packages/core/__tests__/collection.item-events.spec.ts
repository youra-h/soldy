import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TActivationExtension,
	TSelectionExtension,
	TOrderExtension,
	TItemContextRegistry,
	TTabs,
	TTabsItem,
	TTabsExtension,
	TTags,
	TTagsItem,
	TTagsExtension,
} from '@soldy/core'
import type { ITabsItem, ITabs, ITagsItem, ITags } from '@soldy/core'

type Item = { id: number; name: string }

type TestExtensions = {
	plain: TPlainExtension<Item>
	activation: TActivationExtension<Item>
	selection: TSelectionExtension<Item>
	order: TOrderExtension<Item>
}

function createCollection() {
	return new TCollectionEngine<Item, TestExtensions>({
		extensions: {
			plain: new TPlainExtension<Item>(),
			activation: new TActivationExtension<Item>(),
			selection: new TSelectionExtension<Item>(),
			order: new TOrderExtension<Item>(),
		},
	})
}

/**
 * Коллекция табов с владельцем, у которого closable включён: item-адаптер
 * резолвит closable как `элемент ?? владелец`.
 */
function createTabs() {
	const owner = new TTabs({ closable: true })
	const col = new TCollectionEngine<
		ITabsItem,
		{ plain: TPlainExtension<ITabsItem>; tabs: TTabsExtension<ITabs, ITabsItem> }
	>({
		extensions: {
			plain: new TPlainExtension<ITabsItem>(),
			tabs: new TTabsExtension({ owner }),
		},
	})

	return { owner, col, registry: new TItemContextRegistry(col.getCore()) }
}

/** То же для тегов: closable набора включён, у элемента своего может не быть. */
function createTags() {
	const owner = new TTags({ closable: true })
	const col = new TCollectionEngine<
		ITagsItem,
		{ plain: TPlainExtension<ITagsItem>; tags: TTagsExtension<ITags, ITagsItem> }
	>({
		extensions: {
			plain: new TPlainExtension<ITagsItem>(),
			tags: new TTagsExtension({ owner }),
		},
	})

	return { owner, col, registry: new TItemContextRegistry(col.getCore()) }
}

describe('Item-адаптеры: проброс событий из расширений', () => {
	it('activation: change:activation → change:active', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.getCore())
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)
		const handler = vi.fn()

		ctx.adapters.activation.events.on('change:active', handler)
		col.extensions.activation.activate(item)

		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('order: change:order пробрасывается при изменении состава коллекции', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.getCore())
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)
		const handler = vi.fn()

		ctx.adapters.order.events.on('change:order', handler)

		// вставка второго элемента → change:items → change:order
		col.extensions.plain.insert({ id: 2, name: 'b' })

		expect(handler).toHaveBeenCalledOnce()
	})

	it('selection: change:selection → change:selected', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.getCore())
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)
		const handler = vi.fn()

		ctx.adapters.selection.events.on('change:selected', handler)
		col.extensions.selection.select(item)

		expect(handler).toHaveBeenCalled()
	})

	it('tabs: change:closable элемента пробрасывается в адаптер', () => {
		const { col, registry } = createTabs()
		const tab = new TTabsItem({ text: 'Tab', value: 'tab' })

		col.extensions.plain.insert(tab)

		const ctx = registry.get(tab)
		const handler = vi.fn()

		ctx.adapters.tabs.events.on('change:closable', handler)
		tab.closable = false

		expect(handler).toHaveBeenCalled()
		expect(ctx.adapters.tabs.closable).toBe(false)
	})

	it('tabs: сброс closable элемента возвращает адаптер к значению владельца', () => {
		const { col, registry } = createTabs()
		const tab = new TTabsItem({ text: 'Tab', value: 'tab', closable: false })

		col.extensions.plain.insert(tab)

		const ctx = registry.get(tab)
		const handler = vi.fn()

		expect(ctx.adapters.tabs.closable).toBe(false)

		ctx.adapters.tabs.events.on('change:closable', handler)

		// undefined у элемента — «наследую от владельца», а не «закрыть нельзя»
		tab.closable = undefined

		expect(handler).toHaveBeenCalledOnce()
		expect(ctx.adapters.tabs.closable).toBe(true)

		// Аргумента у события нет намеренно: источников у значения два и ни один
		// не равен результату, поэтому читатель берёт его геттером.
		// @ts-expect-error — 'change:closable' item-адаптера объявлен как () => void
		ctx.adapters.tabs.events.on('change:closable', (value: boolean) => value)
	})

	it('tags: сброс closable тега возвращает адаптер к значению набора', () => {
		const { col, registry } = createTags()
		const tag = new TTagsItem({ text: 'Tag', value: 'tag', closable: false })

		col.extensions.plain.insert(tag)

		const ctx = registry.get(tag)
		const handler = vi.fn()

		expect(ctx.adapters.tags.closable).toBe(false)

		ctx.adapters.tags.events.on('change:closable', handler)

		tag.closable = undefined

		expect(handler).toHaveBeenCalledOnce()
		expect(ctx.adapters.tags.closable).toBe(true)

		// @ts-expect-error — 'change:closable' item-адаптера объявлен как () => void
		ctx.adapters.tags.events.on('change:closable', (value: boolean) => value)
	})

	it('удаление элемента отписывает item-адаптер от расширения (нет утечки)', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.getCore())
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)
		const adapter = ctx.adapters.activation
		const emitSpy = vi.spyOn(adapter.events, 'emit')

		// удаляем элемент → item:removed → registry.destroy → adapter.destroy → events.destroy
		col.extensions.plain.remove(item)
		emitSpy.mockClear()

		// активируем другой элемент — расширение эмитит change:activation
		const other: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(other)
		col.extensions.activation.activate(other)

		// relay-подписка удалённого адаптера уже разорвана
		expect(emitSpy).not.toHaveBeenCalled()
	})
})
