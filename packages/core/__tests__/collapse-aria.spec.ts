/**
 * ARIA у Collapse: связка «заголовок ↔ панель» и состояние раскрытия.
 *
 * Асимметрия с Tabs намеренная. У Tabs панель — самостоятельный компонент, и
 * её сторона пишется в её собственный `aria`. У Collapse панель лежит внутри
 * элемента и отдельно от него не существует: своего набора у неё нет, поэтому
 * её сторона остаётся пропом фасада, а в `aria` элемента пишется только
 * сторона заголовка.
 */

import { describe, it, expect } from 'vitest'
import {
	TCollapse,
	TCollapseItem,
	TCollapseCollectionFacade,
	TCollapseItemCollectionFacade,
	TItemContextRegistry,
} from '@soldy/core'
import type { ICollapseItem } from '@soldy/core'

function createCollapse(values: string[]) {
	const owner = new TCollapse({ mode: 'multiple' })
	const collection = new TCollapseCollectionFacade({}, { owner })
	const items = values.map((value) => new TCollapseItem({ value, text: value }))

	collection.items = items as ICollapseItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())

	/** Фасад элемента — через него читается сторона панели. */
	const facadeFor = (index: number) => {
		const facade = new TCollapseItemCollectionFacade()

		facade.setContext(registry.get(items[index]) as any)

		return facade
	}

	return { owner, collection, items, facadeFor }
}

describe('связка заголовок ↔ панель', () => {
	it('заголовок получает свою сторону при добавлении в коллекцию', () => {
		// Не при первом обращении из шаблона: так связка попадает в первую же
		// отрисовку, включая серверную
		const { items } = createCollapse(['a'])

		expect(items[0].aria.get('id')).toBe(`s-collapse-header-${items[0].uid}`)
		expect(items[0].aria.get('aria-controls')).toBe(`s-collapse-content-${items[0].uid}`)
	})

	it('половинки сходятся: aria-controls заголовка — это id панели', () => {
		const { items, facadeFor } = createCollapse(['a'])
		const panel = facadeFor(0).content_aria

		expect(items[0].aria.get('aria-controls')).toBe(panel.id)
		expect(panel['aria-labelledby']).toBe(items[0].aria.get('id'))
	})

	it('панель объявлена как region', () => {
		expect(createCollapse(['a']).facadeFor(0).content_aria.role).toBe('region')
	})

	it('id уникальны между элементами', () => {
		const { items } = createCollapse(['a', 'b'])

		expect(items[0].aria.get('id')).not.toBe(items[1].aria.get('id'))
	})
})

describe('aria-expanded', () => {
	it('стоит на всех заголовках, а не только на раскрытых', () => {
		const { collection, items } = createCollapse(['a', 'b'])

		collection.engine.extensions.selection.select(items[0])

		expect(items[0].aria.get('aria-expanded')).toBe('true')
		expect(items[1].aria.get('aria-expanded')).toBe('false')
	})

	it('следует за раскрытием и сворачиванием', () => {
		const { collection, items } = createCollapse(['a'])
		const selection = collection.engine.extensions.selection

		selection.select(items[0])
		expect(items[0].aria.get('aria-expanded')).toBe('true')

		selection.deselect(items[0])
		expect(items[0].aria.get('aria-expanded')).toBe('false')
	})

	it('появляется у элемента, добавленного позже', () => {
		const { collection, items } = createCollapse(['a'])
		const added = new TCollapseItem({ value: 'b', text: 'b' })

		collection.items = [...items, added] as ICollapseItem[]

		expect(added.aria.get('aria-expanded')).toBe('false')
		expect(added.aria.get('id')).toBe(`s-collapse-header-${added.uid}`)
	})
})
