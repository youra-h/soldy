/**
 * ARIA у Accordion: связка «заголовок ↔ панель» и состояние раскрытия.
 *
 * Асимметрия с Tabs намеренная. У Tabs панель — самостоятельный компонент, и
 * её сторона пишется в её собственный `aria`. У Accordion панель лежит внутри
 * элемента и отдельно от него не существует: своего набора у неё нет, поэтому
 * её сторона остаётся пропом фасада, а в `aria` элемента пишется только
 * сторона заголовка.
 */

import { describe, it, expect } from 'vitest'
import {
	TAccordion,
	TAccordionItem,
	TAccordionCollectionFacade,
	TAccordionItemCollectionFacade,
	TItemContextRegistry,
} from '@soldy/core'
import type { IAccordionItem } from '@soldy/core'

function createAccordion(values: string[]) {
	const owner = new TAccordion({ mode: 'multiple' })
	const collection = new TAccordionCollectionFacade({}, { owner })
	const items = values.map((value) => new TAccordionItem({ value, text: value }))

	collection.items = items as IAccordionItem[]

	const registry = new TItemContextRegistry(collection.engine.getCore())

	/** Фасад элемента — через него читается сторона панели. */
	const facadeFor = (index: number) => {
		const facade = new TAccordionItemCollectionFacade()

		facade.setContext(registry.get(items[index]) as any)

		return facade
	}

	return { owner, collection, items, facadeFor }
}

describe('связка заголовок ↔ панель', () => {
	it('заголовок получает свою сторону при добавлении в коллекцию', () => {
		// Не при первом обращении из шаблона: так связка попадает в первую же
		// отрисовку, включая серверную
		const { items } = createAccordion(['a'])

		expect(items[0].aria.get('id')).toBe(`s-accordion-header-${items[0].uid}`)
		expect(items[0].aria.get('aria-controls')).toBe(`s-accordion-content-${items[0].uid}`)
	})

	it('половинки сходятся: aria-controls заголовка — это id панели', () => {
		const { items, facadeFor } = createAccordion(['a'])
		const panel = facadeFor(0).content_aria

		expect(items[0].aria.get('aria-controls')).toBe(panel.id)
		expect(panel['aria-labelledby']).toBe(items[0].aria.get('id'))
	})

	it('панель объявлена как region', () => {
		expect(createAccordion(['a']).facadeFor(0).content_aria.role).toBe('region')
	})

	it('id уникальны между элементами', () => {
		const { items } = createAccordion(['a', 'b'])

		expect(items[0].aria.get('id')).not.toBe(items[1].aria.get('id'))
	})
})

describe('aria-expanded', () => {
	it('стоит на всех заголовках, а не только на раскрытых', () => {
		const { collection, items } = createAccordion(['a', 'b'])

		collection.engine.extensions.selection.select(items[0])

		expect(items[0].aria.get('aria-expanded')).toBe('true')
		expect(items[1].aria.get('aria-expanded')).toBe('false')
	})

	it('следует за раскрытием и сворачиванием', () => {
		const { collection, items } = createAccordion(['a'])
		const selection = collection.engine.extensions.selection

		selection.select(items[0])
		expect(items[0].aria.get('aria-expanded')).toBe('true')

		selection.deselect(items[0])
		expect(items[0].aria.get('aria-expanded')).toBe('false')
	})

	it('появляется у элемента, добавленного позже', () => {
		const { collection, items } = createAccordion(['a'])
		const added = new TAccordionItem({ value: 'b', text: 'b' })

		collection.items = [...items, added] as IAccordionItem[]

		expect(added.aria.get('aria-expanded')).toBe('false')
		expect(added.aria.get('id')).toBe(`s-accordion-header-${added.uid}`)
	})
})
