import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TActivationExtension,
	TSelectionExtension,
	TOrderExtension,
	TItemContext,
	TItemContextRegistry,
	TTabs,
	TTabsItem,
	TTabsExtension,
} from '@soldy-ui/core'
import type {
	ITabsItem,
	ITabs,
	TActivationItemEventsExtension,
	TSelectionItemEventsExtension,
	TSelectionMode,
} from '@soldy-ui/core'

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
	it('activation: change:activation → change:active с активностью элемента', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.getCore())
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)
		const handler = vi.fn()

		ctx.adapters.activation.events.on('change:active', handler)
		col.extensions.activation.activate(item)

		expect(handler.mock.calls).toEqual([[true]])
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

	it('selection: change:selection → change:selected с отметкой элемента', () => {
		const col = createCollection()
		const registry = new TItemContextRegistry(col.getCore())
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		const ctx = registry.get(item)
		const handler = vi.fn()

		ctx.adapters.selection.events.on('change:selected', handler)
		col.extensions.selection.select(item)

		expect(handler.mock.calls).toEqual([[true]])
	})

	it('tabs: change:closable элемента пробрасывается в адаптер', () => {
		const tabs = new TTabs({ closable: true })
		const col = new TCollectionEngine<
			ITabsItem,
			{ plain: TPlainExtension<ITabsItem>; tabs: TTabsExtension<ITabs, ITabsItem> }
		>({
			extensions: {
				plain: new TPlainExtension<ITabsItem>(),
				tabs: new TTabsExtension(),
			},
		})
		col.options.set({ owner: tabs })
		const registry = new TItemContextRegistry(col.getCore())
		const tab = new TTabsItem({ text: 'Tab', value: 'tab' })

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

	it('событие элемента несёт значение: отметку и активность', () => {
		expectTypeOf<Parameters<TSelectionItemEventsExtension['change:selected']>>().toEqualTypeOf<
			[value: boolean]
		>()
		expectTypeOf<Parameters<TActivationItemEventsExtension['change:active']>>().toEqualTypeOf<
			[value: boolean]
		>()
	})
})

/**
 * `change:selected` и `change:active` — событие элемента о его собственной
 * отметке. Расширение шлёт смену набора всем item-адаптерам, а они отдают
 * событие наружу только тому элементу, чья отметка сменилась, и с ней самой:
 * колбэк элемента в адаптерах фреймворков — `onChangeSelected={(selected) => …}`,
 * и пара «проп + колбэк» держит отметку в состоянии приложения без чтения
 * коллекции. Раньше событие получал каждый элемент на любую смену выбора, а
 * аргументом шёл список выбранных.
 *
 * Контексты здесь — контексты монтирований (`TItemContext`), как у адаптеров:
 * удаление элемента их не уничтожает.
 */
describe('Item-адаптеры: событие — только элементу, чья отметка сменилась', () => {
	/** Три элемента в режиме `mode`; события их адаптеров — в журнал, по порядку. */
	function watched(mode: TSelectionMode = 'single') {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const c: Item = { id: 3, name: 'c' }
		const log: string[] = []

		for (const item of [a, b, c]) col.extensions.plain.push(item)

		col.extensions.selection.mode = mode

		for (const item of [a, b, c]) {
			const { adapters } = new TItemContext<Item, TestExtensions>(
				item,
				col.getCore().extensions,
			)

			adapters.selection.events.on('change:selected', (value) => {
				log.push(`${item.name}: selected ${value}`)
			})
			adapters.activation.events.on('change:active', (value) => {
				log.push(`${item.name}: active ${value}`)
			})
		}

		return { col, a, b, c, log, selection: col.extensions.selection }
	}

	it('single: выбор B при выбранном A — A получает false, B — true, C молчит', () => {
		const { selection, a, b, log } = watched()

		selection.select(a)
		log.length = 0
		selection.select(b)

		expect(log).toEqual(['a: selected false', 'b: selected true'])
	})

	it('multiple: выбор и снятие — только своему элементу', () => {
		const { selection, a, b, log } = watched('multiple')

		selection.select(a)
		selection.select(b)
		selection.deselect(a)

		expect(log).toEqual(['a: selected true', 'b: selected true', 'a: selected false'])
	})

	it('выбрать выбранное — тишина', () => {
		const { selection, a, log } = watched()

		selection.select(a)
		log.length = 0
		selection.select(a)

		expect(log).toEqual([])
	})

	it('пачкой: selectMany и deselectMany — только сменившимся', () => {
		const { selection, a, b, c, log } = watched('multiple')

		selection.select(b)
		log.length = 0
		selection.selectMany([a, b, c])

		expect(log).toEqual(['a: selected true', 'c: selected true'])

		selection.deselect(c)
		log.length = 0
		selection.deselectMany([a, c])

		expect(log).toEqual(['a: selected false'])
	})

	it('replaceSelection перестановкой — элементы молчат', () => {
		const { selection, a, b, log } = watched('multiple')

		selection.selectMany([a, b])
		log.length = 0
		selection.replaceSelection([b, a])

		expect(selection.selected).toEqual([b, a])
		expect(log).toEqual([])
	})

	it('replaceSelection: снятые получают false, новые — true, оставшиеся молчат', () => {
		const { selection, a, b, c, log } = watched('multiple')

		selection.selectMany([a, b])
		log.length = 0
		selection.replaceSelection([b, c])

		expect(log).toEqual(['a: selected false', 'c: selected true'])
	})

	it('resetSelection — false выбранным, невыбранный молчит', () => {
		const { selection, a, c, log } = watched('multiple')

		selection.selectMany([a, c])
		log.length = 0
		selection.resetSelection()

		expect(log).toEqual(['a: selected false', 'c: selected false'])
	})

	it('multiple → single — выбор снят, false выбранным', () => {
		const { selection, a, b, log } = watched('multiple')

		selection.selectMany([a, b])
		log.length = 0
		selection.mode = 'single'

		expect(log).toEqual(['a: selected false', 'b: selected false'])
	})

	it('удаление выбранного — удалённый получает false, остальные молчат', () => {
		const { col, selection, a, b, log } = watched('multiple')

		selection.selectMany([a, b])
		log.length = 0
		col.extensions.plain.remove(b)

		expect(selection.selected).toEqual([a])
		expect(log).toEqual(['b: selected false'])
	})

	it('активация A → B: A получает false, B — true, C молчит; reset — false активному', () => {
		const { col, a, b, log } = watched()
		const { activation } = col.extensions

		activation.activate(a)

		expect(log).toEqual(['a: active true'])

		log.length = 0
		activation.activate(b)

		expect(log).toEqual(['a: active false', 'b: active true'])

		log.length = 0
		activation.reset()

		expect(log).toEqual(['b: active false'])
	})

	it('деактивация — false только снятому', () => {
		const { col, a, log } = watched()
		const { activation } = col.extensions

		activation.activate(a)
		log.length = 0
		activation.deactivate(a)

		expect(log).toEqual(['a: active false'])
	})

	/**
	 * Своя реакция адаптера на расширение — на сроке пробросов: пока адаптер
	 * не слушают, на расширении его нет. Движок снаружи живёт дольше
	 * монтирований, и адаптер, подписанный навсегда, остался бы на нём.
	 */
	it('адаптер подписан на расширение, только пока его слушают', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const { selection } = col.extensions
		const on = vi.spyOn(selection.events, 'on')
		const off = vi.spyOn(selection.events, 'off')
		const followed = (calls: ReadonlyArray<readonly unknown[]>) =>
			calls.filter(([event]) => event === 'change:selection')

		col.extensions.plain.push(item)

		const { adapters } = new TItemContext<Item, TestExtensions>(item, col.getCore().extensions)
		const adapter = adapters.selection
		const handler = vi.fn()

		expect(followed(on.mock.calls)).toHaveLength(0)

		adapter.events.on('change:selected', handler)

		expect(followed(on.mock.calls)).toHaveLength(1)

		adapter.events.off('change:selected', handler)

		expect(followed(off.mock.calls)).toHaveLength(1)
	})
})
