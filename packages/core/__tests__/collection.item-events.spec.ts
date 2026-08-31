import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TActivationExtension,
	TSelectionExtension,
	TOrderExtension,
	TItemContextRegistry,
	TTabs,
	TTabItem,
	TTabsExtension,
} from '@soldy/core'
import type { ITabItem, ITabs } from '@soldy/core'

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

		expect(handler).toHaveBeenCalled()
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
		const tabs = new TTabs({ closable: true })
		const col = new TCollectionEngine<
			ITabItem,
			{ plain: TPlainExtension<ITabItem>; tabs: TTabsExtension<ITabs, ITabItem> }
		>({
			extensions: {
				plain: new TPlainExtension<ITabItem>(),
				tabs: new TTabsExtension({ owner: tabs }),
			},
		})
		const registry = new TItemContextRegistry(col.getCore())
		const tab = new TTabItem({ text: 'Tab', value: 'tab' })

		col.extensions.plain.insert(tab)

		const ctx = registry.get(tab)
		const handler = vi.fn()

		ctx.adapters.tabs.events.on('change:closable', handler)
		tab.closable = false

		expect(handler).toHaveBeenCalled()
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
