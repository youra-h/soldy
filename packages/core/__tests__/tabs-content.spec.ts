/**
 * Панель таба (`TabsContent`) и её коллекционный фасад.
 *
 * Панель появилась потому, что раньше содержимое отдавалось динамическим слотом
 * `panel:${value}` — такое имя резолвит только Vue, и в остальных пяти
 * адаптерах панели были недостижимы.
 *
 * Слои разделены как у элемента: `TTabsContent` держит только свои props,
 * события и роль, а членство в коллекции — активность — держит
 * `TTabsContentCollectionFacade`.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	TTabs,
	TTabsItem,
	TTabsContent,
	TTabsContentCollectionFacade,
	TTabsCollectionFacade,
	TItemContextRegistry,
} from '@soldy-ui/core'
import type { ITabsItem } from '@soldy-ui/core'

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

		if (item) facade.setContext(registry.get(item))

		return facade
	}

	/** Контекст таба с таким значением; таба нет — тест падает здесь. */
	const contextOf = (value: string) => {
		const item = find(value)

		if (!item) throw new Error(`таба «${value}» нет`)

		return registry.get(item)
	}

	return { owner, collection, items, facadeFor, contextOf }
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

/**
 * Контекст у панели меняется, пока она смонтирована: `value` привело её к
 * другому табу или ни к какому. Адаптер активации нового таба о прежнем не
 * знает, поэтому о смене активности сообщает сам фасад — и только о смене.
 */
describe('фасад панели — смена контекста', () => {
	/** Табы `a`, `b`, `c`, активен `a`; фасад панели — у таба `value`, без него — ни у какого. */
	function bound(value?: string) {
		const { collection, items, facadeFor, contextOf } = createTabs(['a', 'b', 'c'])

		collection.activate(items[0])

		const facade = value ? facadeFor(value) : new TTabsContentCollectionFacade()
		const handler = vi.fn()

		facade.events.on('change:active', handler)

		return { facade, handler, contextOf }
	}

	it('с активного таба на неактивный — change:active, панель неактивна', () => {
		const { facade, handler, contextOf } = bound('a')

		expect(facade.active).toBe(true)

		facade.setContext(contextOf('b'))

		expect(facade.active).toBe(false)
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('с неактивного таба на активный — change:active, панель активна', () => {
		const { facade, handler, contextOf } = bound('b')

		facade.setContext(contextOf('a'))

		expect(facade.active).toBe(true)
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('панель без таба получила активный — change:active', () => {
		const { facade, handler, contextOf } = bound()

		expect(facade.active).toBe(false)

		facade.setContext(contextOf('a'))

		expect(facade.active).toBe(true)
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('активность не сменилась — тишина', () => {
		const { facade, handler, contextOf } = bound('b')

		facade.setContext(contextOf('c'))

		expect(facade.active).toBe(false)
		expect(handler).not.toHaveBeenCalled()
	})

	it('снятие контекста активного таба — change:active, таба у панели нет', () => {
		const { facade, handler } = bound('a')

		facade.clearContext()

		expect(facade.active).toBe(false)
		expect(facade.item).toBeUndefined()
		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('снятие контекста неактивного таба — тишина', () => {
		const { facade, handler } = bound('b')

		facade.clearContext()

		expect(facade.item).toBeUndefined()
		expect(handler).not.toHaveBeenCalled()
	})
})

/**
 * Связку «таб ↔ панель» — `id` и ссылки — ядро не пишет: `id` нужны документу.
 * Сторону таба пишет плагин таба (`TTabsItemIdsPlugin`, plugins,
 * ids.plugin.spec), сторону панели — проводка, когда панель нашла свой таб
 * (`TTabsContentBindingExtension`, setup, adapter.spec). Ядро панели знает о
 * себе только то, что она — панель таба.
 */
describe('ARIA панели', () => {
	it('панель таба и остановка Tab сразу за списком, без id', () => {
		// По APG Tab из списка (там одна остановка на все табы) ведёт на панель
		expect(new TTabsContent({ value: 'a' }).aria.toObject()).toEqual({
			role: 'tabpanel',
			tabindex: '0',
		})
	})

	it('у таба связки от ядра нет', () => {
		const { items } = createTabs(['a'])

		expect(items[0].aria.has('id')).toBe(false)
		expect(items[0].aria.has('aria-controls')).toBe(false)
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
