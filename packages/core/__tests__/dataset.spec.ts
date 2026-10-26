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
	TTabs,
	TTabsItem,
	TTabsCollectionFacade,
} from '../src'
import type { ISelectItem, ITabsItem } from '@soldy-ui/core'

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

	it('подписчик зовётся только при настоящем изменении', () => {
		let count = 0
		const dataset = new TDataset()
		dataset.subscribe(() => count++)

		dataset.add('selected', true)
		dataset.add('selected', true)
		dataset.remove('nothing')

		expect(count).toBe(1)
	})

	/**
	 * One entry per canonical name, as a `Map` gave: `selected` and
	 * `data-selected` are one attribute, the last value wins, and the entry
	 * stays where the name came first.
	 */
	it('имя с префиксом и без в начальных записях — одна запись, побеждает последняя', () => {
		const dataset = new TDataset({ selected: 'true', open: 'true', 'data-selected': 'false' })

		expect(dataset.names).toEqual(['data-selected', 'data-open'])
		expect(dataset.get('selected')).toBe('false')
		expect(Object.entries(dataset.toObject())).toEqual([
			['data-selected', 'false'],
			['data-open', 'true'],
		])
	})

	/** The prefix goes to the name looked for, not to the values: a value is never taken for a name. */
	it('значение, равное чужому имени с префиксом, не находят ни has, ни get', () => {
		const dataset = new TDataset({ placement: 'data-open' })

		expect(dataset.has('open')).toBe(false)
		expect(dataset.get('data-open')).toBeUndefined()
	})

	it('смена значения на месте, снятие и возврат — порядок тот же, что давала карта', () => {
		const dataset = new TDataset()
			.add('disabled', false)
			.add('selected', false)
			.add('indicator', 'none')

		dataset.add('selected', true)
		expect(dataset.names).toEqual(['data-disabled', 'data-selected', 'data-indicator'])

		dataset.remove('disabled')
		dataset.add('disabled', true)
		expect(dataset.names).toEqual(['data-selected', 'data-indicator', 'data-disabled'])
		expect(Object.entries(dataset.toObject())).toEqual([
			['data-selected', 'true'],
			['data-indicator', 'none'],
			['data-disabled', 'true'],
		])
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
		const facade = new TSelectCollectionFacade({}, { owner: new TSelect() })
		const items = values.map((value) => new TSelectItem({ value, text: value }))

		facade.items = items as ISelectItem[]

		return { facade, items }
	}

	it('проставляется всем элементам сразу при добавлении', () => {
		const { items } = createSelect(['a', 'b'])

		expect(items.map((item) => item.dataset.get('selected'))).toEqual(['false', 'false'])
	})

	it('следует за выбором', () => {
		const { facade, items } = createSelect(['a', 'b'])

		facade.engine.extensions.selection.select(items[1])

		expect(items[0].dataset.get('selected')).toBe('false')
		expect(items[1].dataset.get('selected')).toBe('true')
	})

	/**
	 * `data-*` пишет движок коллекции, ARIA — расширение компонента. Разделение
	 * не формальное: `data-selected` у всех списков один, а роль у каждого
	 * своя, и связать их значило бы чинить доступность ценой вида.
	 */
	it('ARIA остаётся отдельным набором', () => {
		const { facade, items } = createSelect(['a', 'b'])

		facade.engine.extensions.selection.select(items[0])

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
		const facade = new TTabsCollectionFacade({}, { owner: new TTabs() })
		const items = [
			new TTabsItem({ value: 'a', text: 'A' }),
			new TTabsItem({ value: 'b', text: 'B' }),
		]

		facade.items = items as ITabsItem[]
		facade.engine.extensions.activation.activate(items[1])

		expect(items.map((item) => item.dataset.get('selected'))).toEqual(['false', 'true'])
	})
})

/**
 * Списочные `data-content-fit` и `data-indicator` проверяются не здесь: у самих
 * ListBox и Select — в `list-contract.spec.ts`, `data-indicator` элементов — в
 * `list-box.spec.ts` и `select.spec.ts`, `data-content-fit` элементов ListBox —
 * в `list-box.spec.ts`, опций Select — в `ui/vue/__tests__/select.spec.ts`.
 */
