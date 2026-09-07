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

	return { owner, collection, items, facadeFor, tabFacadeFor }
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
	it('обе стороны считает один item-адаптер и потому они сходятся', () => {
		const { facadeFor, tabFacadeFor } = createTabs(['a', 'b'])
		const panel = facadeFor('a')
		const tab = tabFacadeFor('a')

		expect(tab.tab_aria['aria-controls']).toBe(panel.content_aria.id)
		expect(panel.content_aria['aria-labelledby']).toBe(tab.tab_aria.id)
	})

	it('таб сам по себе о панели не знает', () => {
		const { items } = createTabs(['a'])

		// role — знание о себе, связка — знание коллекции
		expect(items[0].aria.role).toBe('tab')
		expect(items[0].aria.id).toBeUndefined()
		expect(items[0].aria['aria-controls']).toBeUndefined()
	})

	it('роль панели приходит со стороны связки', () => {
		expect(createTabs(['a']).facadeFor('a').content_aria.role).toBe('tabpanel')
	})

	it('id панели берётся от связанного таба, а не от самой панели', () => {
		const { items, facadeFor } = createTabs(['a'])
		const panel = facadeFor('a')

		expect(panel.content_aria.id).toContain(String(items[0].uid))
		expect(panel.content_aria.id).not.toContain(String(panel.uid))
	})

	it('id уникальны между двумя группами табов на одной странице', () => {
		const first = createTabs(['a'])
		const second = createTabs(['a'])

		// Значение одинаковое, но uid разные — коллизии нет
		expect(first.tabFacadeFor('a').tab_aria.id).not.toBe(
			second.tabFacadeFor('a').tab_aria.id,
		)
	})

	it('без контекста связки нет вовсе', () => {
		const panel = new TTabsContentCollectionFacade()
		const tab = new TTabsItemCollectionFacade()

		expect(panel.content_aria).toEqual({})
		expect(tab.tab_aria).toEqual({})
	})
})
