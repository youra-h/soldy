/**
 * Панель таба (`TabsContent`) и её коллекционный фасад.
 *
 * Панель появилась потому, что раньше содержимое отдавалось динамическим слотом
 * `panel:${value}` — такое имя резолвит только Vue, и в остальных пяти
 * адаптерах панели были недостижимы. Плюс панели нужен `id`, чтобы таб мог
 * сослаться на неё через `aria-controls`.
 *
 * Слои разделены как у элемента: `TTabsContent` держит только свои props и
 * события, а всё, что про членство в коллекции — активность и ARIA-связку —
 * держит `TTabsContentCollectionFacade`.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TTabs,
	TTabsItem,
	TTabsContent,
	TTabsContentCollectionFacade,
	TTabsItemCollectionFacade,
	TTabsCollectionFacade,
	TItemContextRegistry,
} from '@soldy/core'
import type { ITabsItem } from '@soldy/core'

function createTabs(values: string[]) {
	const owner = new TTabs()
	const collection = new TTabsCollectionFacade({}, { owner })
	const items = values.map((value) => new TTabsItem({ value, text: value }))

	collection.items = items as ITabsItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())
	const find = (value: string) => items.find((candidate) => candidate.value === value)

	/** Фасад панели, привязанный к табу с таким значением. */
	const facadeFor = (value: string) => {
		const facade = new TTabsContentCollectionFacade()
		const item = find(value)

		if (item) facade.setContext(registry.get(item) as any)

		return facade
	}

	/** Фасад самого таба — вторая сторона связки. */
	const tabFacadeFor = (value: string) => {
		const facade = new TTabsItemCollectionFacade()
		const item = find(value)

		if (item) facade.setContext(registry.get(item) as any)

		return facade
	}

	/** Контекст item-адаптеров таба с таким значением. */
	const contextFor = (value: string) => registry.get(find(value)!) as any

	return { owner, collection, items, facadeFor, tabFacadeFor, contextFor }
}

describe('TTabsContent — собственные props', () => {
	it('о коллекции ничего не знает', () => {
		const content = new TTabsContent({ value: 'a' })

		// Ни активности, ни движка: это ответственность фасада
		expect('active' in content).toBe(false)
		expect('bindEngine' in content).toBe(false)
	})

	it('value эмитит change:value только при реальном изменении', () => {
		const content = new TTabsContent({ value: 'a' })
		const handler = vi.fn()

		content.events.on('change:value', handler)

		content.value = 'b'
		expect(handler).toHaveBeenCalledTimes(1)

		content.value = 'b'
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('несёт класс панели', () => {
		expect(new TTabsContent().classes.toArray()).toContain('s-tabs__panel')
	})
})

describe('фасад панели — активность', () => {
	it('без контекста панель неактивна и не падает', () => {
		const facade = new TTabsContentCollectionFacade()

		expect(facade.active).toBe(false)
		expect(facade.item).toBeUndefined()
	})

	it('active следует за активным табом', () => {
		const { collection, items, facadeFor } = createTabs(['a', 'b'])
		const facade = facadeFor('b')

		expect(facade.active).toBe(false)

		collection.activate(items[1])
		expect(facade.active).toBe(true)

		collection.activate(items[0])
		expect(facade.active).toBe(false)
	})

	it('фасад находит именно свой таб', () => {
		const { items, facadeFor } = createTabs(['a', 'b'])

		expect(facadeFor('b').item).toBe(items[1])
	})

	it('релеит change:active наружу', () => {
		const { collection, items, facadeFor } = createTabs(['a', 'b'])
		const facade = facadeFor('b')
		const handler = vi.fn()

		facade.events.on('change:active', handler)
		collection.activate(items[1])

		expect(handler).toHaveBeenCalled()
	})
})

describe('связка ARIA таб ↔ панель', () => {
	/** Сторона панели — её читает проводка, когда панель нашла свой таб. */
	const panelAriaFor = (ctx: ReturnType<typeof createTabs>, value: string) =>
		(ctx.contextFor(value).adapters.content as any).panelAria

	it('таб получает свою сторону связки при добавлении в коллекцию', () => {
		// Не при появлении панели: так связка попадает в первую же отрисовку,
		// в том числе серверную
		const { items } = createTabs(['a'])

		expect(items[0].aria.get('id')).toBe(`s-tab-${items[0].uid}`)
		expect(items[0].aria.get('aria-controls')).toBe(`s-tabpanel-${items[0].uid}`)
	})

	it('половинки сходятся: aria-controls таба — это id панели', () => {
		const ctx = createTabs(['a', 'b'])
		const panel = panelAriaFor(ctx, 'a')

		expect(ctx.items[0].aria.get('aria-controls')).toBe(panel.id)
		expect(panel['aria-labelledby']).toBe(ctx.items[0].aria.get('id'))
	})

	it('формула идентификаторов одна на обе стороны', () => {
		// Разнеси её по двум местам — и половинки однажды разойдутся
		const ctx = createTabs(['a'])
		const content = ctx.collection.engine.extensions.content as any

		expect(content.tabId(ctx.items[0])).toBe(ctx.items[0].aria.get('id'))
		expect(content.panelId(ctx.items[0])).toBe(panelAriaFor(ctx, 'a').id)
	})

	it('роль панели приходит со стороны связки', () => {
		expect(panelAriaFor(createTabs(['a']), 'a').role).toBe('tabpanel')
	})

	it('id панели берётся от связанного таба, а не от самой панели', () => {
		const ctx = createTabs(['a'])

		expect(panelAriaFor(ctx, 'a').id).toContain(String(ctx.items[0].uid))
	})

	it('id уникальны между двумя группами табов на одной странице', () => {
		const first = createTabs(['a'])
		const second = createTabs(['a'])

		// Значение одинаковое, но uid разные — коллизии нет
		expect(first.items[0].aria.get('id')).not.toBe(second.items[0].aria.get('id'))
	})

	it('без контекста у фасада панели связки нет', () => {
		expect(new TTabsContentCollectionFacade().active).toBe(false)
	})
})

describe('aria-selected на табах', () => {
	it('стоит на всех табах набора, а не только на активном', () => {
		// Скринридер объявляет «1 из 2, не выбрана» — для этого атрибут
		// должен быть и у невыбранных
		const { collection, items } = createTabs(['a', 'b'])

		collection.engine.extensions.activation.activate(items[0])

		expect(items[0].aria.get('aria-selected')).toBe('true')
		expect(items[1].aria.get('aria-selected')).toBe('false')
	})

	it('следует за переключением активного таба', () => {
		const { collection, items } = createTabs(['a', 'b'])
		const activation = collection.engine.extensions.activation

		activation.activate(items[0])
		activation.activate(items[1])

		expect(items[0].aria.get('aria-selected')).toBe('false')
		expect(items[1].aria.get('aria-selected')).toBe('true')
	})

	it('появляется у таба, добавленного позже', () => {
		const { collection, items } = createTabs(['a'])
		const added = new TTabsItem({ value: 'b', text: 'b' })

		collection.items = [...items, added] as ITabsItem[]

		expect(added.aria.get('aria-selected')).toBe('false')
	})
})
