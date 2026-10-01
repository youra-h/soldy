/**
 * ARIA у Accordion: панель секции и состояние раскрытия.
 *
 * Панель лежит внутри секции и отдельно от неё не существует: экземпляра у неё
 * нет, поэтому её набор — секции (`contentAria`). Связку «заголовок ↔ панель»
 * — `id` и ссылки — ядро не пишет: `id` нужны документу, их пишет
 * `TAccordionItemIdsPlugin` (plugins, ids.plugin.spec).
 */

import { describe, it, expect } from 'vitest'
import { TAccordion, TAccordionItem, TAccordionCollectionFacade } from '@soldy-ui/core'
import type { IAccordionItem } from '@soldy-ui/core'

function createAccordion(values: string[]) {
	const owner = new TAccordion({ mode: 'multiple' })
	const collection = new TAccordionCollectionFacade({}, { owner })
	const items = values.map((value) => new TAccordionItem({ value, text: value }))

	collection.items = items as IAccordionItem[]

	return { owner, collection, items }
}

describe('панель секции', () => {
	it('объявлена как region — набором секции', () => {
		expect(new TAccordionItem().contentAria.toObject()).toEqual({ role: 'region' })
	})

	it('связки заголовка и панели у ядра нет', () => {
		const { items } = createAccordion(['a'])

		expect(items[0].aria.has('id')).toBe(false)
		expect(items[0].aria.has('aria-controls')).toBe(false)
	})

	it('change:contentAria — на смену набора панели', () => {
		const item = new TAccordionItem()
		const changes: unknown[] = []

		item.events.on('change:contentAria', (value) => changes.push(value))
		item.contentAria.add('id', 'panel')

		expect(changes).toEqual([{ role: 'region', id: 'panel' }])
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
	})
})
