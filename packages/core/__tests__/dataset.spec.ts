/**
 * `dataset` — набор `data-*` компонента, контракт с темой.
 *
 * Парный к `aria` и устроен так же: живой объект в `TComponentView`, в который
 * пишут ядро, плагины и расширения коллекции. DOM здесь не участвует.
 *
 * Повод для набора — то, что раньше эти атрибуты вычисляли шаблоны. Шесть
 * биндингов в Vue уже разошлись: ListBox отдавал `data-highlighted` сырым,
 * Select — через `String(!!value)`. Работало по случайности, а при портировании
 * на остальные пять адаптеров копий стало бы тридцать.
 */

import { describe, it, expect } from 'vitest'
import {
	TDataset,
	TComponentView,
	TSelect,
	TSelectItem,
	TSelectCollectionFacade,
	TListBox,
	TListBoxItem,
	TListCollectionFacade,
	TTabs,
	TTabsItem,
	TTabsCollectionFacade,
} from '../src'
import type { ISelectItem, IListItem, ITabsItem } from '@soldy/core'

describe('TDataset · сам набор', () => {
	it('подставляет префикс data-', () => {
		expect(new TDataset().add('selected', 'true').toObject()).toEqual({
			'data-selected': 'true',
		})
	})

	it('не удваивает префикс, если имя уже с ним', () => {
		const dataset = new TDataset().add('data-open', 'true')

		expect(dataset.get('open')).toBe('true')
		expect(dataset.names).toEqual(['data-open'])
	})

	/**
	 * Ровно то преобразование, которое раньше писали в шаблоне как
	 * `String(selected)`.
	 */
	it('приводит булево и число к строке', () => {
		const dataset = new TDataset().add('selected', true).add('index', 2)

		expect(dataset.get('selected')).toBe('true')
		expect(dataset.get('index')).toBe('2')
	})

	/**
	 * Тема смотрит `[data-x='true']`, поэтому «выключено» обязано отличаться от
	 * «неприменимо»: `false` остаётся атрибутом, снимает только `null`.
	 */
	it('false даёт "false", а null снимает атрибут', () => {
		const dataset = new TDataset().add('selected', false)

		expect(dataset.get('selected')).toBe('false')

		dataset.add('selected', null)

		expect(dataset.has('selected')).toBe(false)
	})

	it('change эмитится только при настоящем изменении', () => {
		const dataset = new TDataset()
		let count = 0

		dataset.events.on('change', () => count++)

		dataset.add('selected', true)
		dataset.add('selected', true)
		dataset.remove('nothing')

		expect(count).toBe(1)
	})

	/**
	 * Контракт границы core → ui: адаптер узнаёт об изменении по смене
	 * идентичности, поэтому наружу обязан уходить новый объект.
	 */
	it('valueOf отдаёт новый объект на каждое чтение', () => {
		const dataset = new TDataset().add('selected', true)

		expect(dataset.valueOf()).not.toBe(dataset.valueOf())
		expect(dataset.valueOf()).toEqual(dataset.valueOf())
	})
})

describe('TComponentView · набор на компоненте', () => {
	it('пуст по умолчанию — своего состояния у визуального слоя нет', () => {
		expect(new TComponentView().dataset.toObject()).toEqual({})
	})

	it('сообщает об изменении одним событием change:dataset', () => {
		const view = new TComponentView()
		const seen: Record<string, string | null>[] = []

		view.events.on('change:dataset', (value) => seen.push(value))

		view.dataset.add('selected', true)

		expect(seen).toEqual([{ 'data-selected': 'true' }])
	})
})

describe('Выбор → data-selected', () => {
	const createSelect = (values: string[]) => {
		const collection = new TSelectCollectionFacade({}, { owner: new TSelect() })
		const items = values.map((value) => new TSelectItem({ value, text: value }))

		collection.items = items as ISelectItem[]

		return { collection, items }
	}

	it('проставляется всем элементам сразу при добавлении', () => {
		const { items } = createSelect(['a', 'b'])

		expect(items.map((item) => item.dataset.get('selected'))).toEqual(['false', 'false'])
	})

	it('следует за выбором', () => {
		const { collection, items } = createSelect(['a', 'b'])

		collection.engine.extensions.selection.select(items[1])

		expect(items[0].dataset.get('selected')).toBe('false')
		expect(items[1].dataset.get('selected')).toBe('true')
	})

	/**
	 * `data-*` пишет движок коллекции, ARIA — расширение компонента. Разделение
	 * не формальное: `data-selected` у всех списков один, а роль у каждого
	 * своя, и связать их значило бы чинить доступность ценой вида.
	 */
	it('ARIA остаётся отдельным набором', () => {
		const { collection, items } = createSelect(['a', 'b'])

		collection.engine.extensions.selection.select(items[0])

		expect(items[0].aria.get('aria-selected')).toBe('true')
		expect(items[0].aria.has('data-selected')).toBe(false)
		expect(items[0].dataset.has('aria-selected')).toBe(false)
	})
})

describe('Активность → data-selected', () => {
	/**
	 * Таб «активен», а не «выбран», но теме он выделенный элемент — как
	 * раскрытая секция и выбранная опция. Разное имя состояния, один контракт
	 * с темой.
	 */
	it('активный таб помечен, остальные — нет', () => {
		const collection = new TTabsCollectionFacade({}, { owner: new TTabs() })
		const items = [
			new TTabsItem({ value: 'a', text: 'A' }),
			new TTabsItem({ value: 'b', text: 'B' }),
		]

		collection.items = items as ITabsItem[]
		collection.engine.extensions.activation.activate(items[1])

		expect(items.map((item) => item.dataset.get('selected'))).toEqual(['false', 'true'])
	})
})

describe('Перенос текста → data-word-wrap', () => {
	const createList = (ownerWordWrap: boolean, itemWordWrap?: boolean) => {
		const collection = new TListCollectionFacade(
			{},
			{ owner: new TListBox({ wordWrap: ownerWordWrap }) },
		)
		const item = new TListBoxItem({ value: 'a', text: 'A', wordWrap: itemWordWrap })

		collection.items = [item] as IListItem[]

		return item
	}

	it('берётся со списка, когда у элемента не задан', () => {
		expect(createList(true).dataset.get('word-wrap')).toBe('true')
	})

	/**
	 * Разрешение «значение элемента поверх значения списка» живёт в расширении
	 * — там же, где вычисляется. Шаблон биндил уже разрешённое значение и тем
	 * самым повторил бы это правило в каждом адаптере.
	 */
	it('значение элемента перекрывает значение списка', () => {
		expect(createList(true, false).dataset.get('word-wrap')).toBe('false')
	})
})
