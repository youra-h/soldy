/**
 * Virtual в Svelte — окно над ListBox и Select на настоящей разметке.
 *
 * Обёртка своего узла не рисует: её окно подхватывает коллекция внутри
 * (`TVirtualCollectionExtension`), и список рисует только видимые элементы, а
 * на месте остальных — распорки под `aria-hidden`. Что попадает в окно,
 * решает ядро (`core/__tests__/collection.draw.spec.ts`), замер — плагин
 * (`plugins/__tests__/virtual.plugin.spec.ts`); раскладки в jsdom нет, и
 * замер здесь подаётся рисованию движка снаружи руками. Сценарии — те же, что
 * у Vue, React и Solid (`ui/vue/__tests__/virtual.spec.ts`,
 * `ui/react/__tests__/virtual.spec.tsx`, `ui/solid/__tests__/virtual.spec.tsx`);
 * окно таблицы — «окно» в `table.spec.ts`, сервер — `collections.server.spec.ts`.
 *
 * Своё у Svelte — сборка один раз, при инициализации компонента: подключение
 * к окну список читает из контекста обёртки (лифт — `setContext`), на
 * выключатель обёртки подписывается при приёме, а снятие списка и снятие
 * обёртки вместе с ним снимают окно с движка снаружи — пересборки, как у
 * React, нет.
 */

import { describe, it, expect } from 'vitest'
import { flushSync } from 'svelte'
import { createEngineListBox, createEngineSelect } from '@soldy-ui/core'
import type { TListBoxCollection } from '@soldy-ui/core'
import { ListBox, Select } from '@soldy-ui/svelte'
import Windowed from './Virtual.test.svelte'
import { mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'

/** `count` элементов: значение `v1`… и текст. */
function items(count: number) {
	return Array.from({ length: count }, (_, index) => ({
		value: `v${index + 1}`,
		text: `Пункт ${index + 1}`,
	}))
}

/** Движок списка снаружи — тест подаёт ему замер. */
function engineOf(count: number): TListBoxCollection {
	return createEngineListBox({ items: items(count) })
}

/** Замер, как его подаёт плагин окна: полоса от верха списка и шаг элементов. */
function measure(engine: TListBoxCollection, top: number, bottom: number, step = 30): void {
	engine.extensions.draw.notifyViewport({ top, bottom, step })
	flushSync()
}

const options = (root: ParentNode = document) => [...root.querySelectorAll('.so-list-box-item')]

const fillers = (root: ParentNode = document) => [
	...root.querySelectorAll<HTMLElement>('.so-list-box__filler'),
]

/** Элемент по тексту, если он в документе. */
function optionOf(text: string): HTMLElement | undefined {
	return options().find(
		(node): node is HTMLElement =>
			node instanceof HTMLElement && node.textContent?.trim() === text,
	)
}

/** Строка элемента: на ней набор `aria` элемента и его `dataset`. */
function optionRow(text: string): HTMLElement {
	const row = optionOf(text)?.querySelector(':scope > .so-button')

	if (!(row instanceof HTMLElement)) throw new Error(`${text}: строки нет`)

	return row
}

/**
 * Узел списка в корне ListBox — в нём элементы и распорки, на нём остановка
 * Tab, и клавиши список берёт с него.
 */
function listRoot(): HTMLElement {
	const root = document.querySelector('.so-list-box > .so-list-box__list')

	if (!(root instanceof HTMLElement)) throw new Error('списка нет')

	return root
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	flushSync()
}

describe('ListBox в окне', () => {
	it('без обёртки — все элементы, распорок нет', () => {
		mount(ListBox, { items: items(80) })

		expect(options()).toHaveLength(80)
		expect(fillers()).toEqual([])
	})

	it('в обёртке — до замера первые 50, без распорок', () => {
		mount(Windowed, { list: { items: items(80) } })

		expect(options()).toHaveLength(50)
		expect(fillers()).toEqual([])
	})

	it('по замеру — распорки на месте пропущенных: скрыты, высотой в элементы, на своём месте', () => {
		const engine = engineOf(200)

		mount(Windowed, { list: { engine } })

		// Видны места 100–109: с запасом — 90–119
		measure(engine, 3000, 3300)

		const root = listRoot()

		expect(fillers(root).map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		expect(
			fillers(root).map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual(['2700px', '2400px'])
		// Место в составе — перед элементом 91 и за последним
		expect(fillers(root).map((filler) => filler.style.order)).toEqual(['90', '200'])
		expect(root.firstElementChild).toBe(fillers(root)[0])
		expect(root.lastElementChild).toBe(fillers(root)[1])
		expect(options(root)).toHaveLength(30)
	})

	it('нарисованным — размер набора и место в нём', () => {
		const engine = engineOf(200)

		mount(Windowed, { list: { engine } })

		measure(engine, 3000, 3300)

		const row = optionRow('Пункт 91')

		expect(row.getAttribute('aria-setsize')).toBe('200')
		expect(row.getAttribute('aria-posinset')).toBe('91')
	})

	it('`enabled` выключает и включает окно на лету', () => {
		const props = reactiveProps({ virtual: { enabled: false }, list: { items: items(80) } })

		mount(Windowed, props)

		expect(options()).toHaveLength(80)
		expect(optionRow('Пункт 1').hasAttribute('aria-posinset')).toBe(false)

		props.virtual = { enabled: true }
		flushSync()

		expect(options()).toHaveLength(50)
		expect(optionRow('Пункт 1').getAttribute('aria-posinset')).toBe('1')

		props.virtual = { enabled: false }
		flushSync()

		expect(options()).toHaveLength(80)
	})

	it('список в слоте элемента окна не наследует', () => {
		mount(Windowed, { kind: 'nested', list: { items: items(60) } })

		const inner = document.querySelector('.inner')

		if (!inner) throw new Error('вложенного списка нет')

		expect(options(inner)).toHaveLength(55)
		// У внешнего — окно: 50 своих элементов и 55 вложенного внутри первого
		expect(options(document.querySelector('.outer') ?? document)).toHaveLength(50 + 55)
	})
})

/**
 * Select в окне: окно — у списка панели, он и прокручивается. Панель
 * телепортирована, и опции входят в коллекцию, когда её смонтирует
 * `Teleport`, — окно рисует их там же, по секциям нарисованного.
 */
describe('Select в окне', () => {
	const selectOptions = () => [...document.querySelectorAll('.so-select__list .so-select-item')]
	const selectFillers = () => [...document.querySelectorAll<HTMLElement>('.so-select__filler')]

	/** Строка опции: на ней набор `aria` опции. */
	function selectRow(text: string): HTMLElement {
		const row = [
			...document.querySelectorAll<HTMLElement>('.so-select-item > .so-button'),
		].find((node) => node.textContent?.trim() === text)

		if (!row) throw new Error(`${text}: строки нет`)

		return row
	}

	it('без обёртки — все опции, распорок нет', () => {
		mount(Select, { items: items(80) })

		expect(selectOptions()).toHaveLength(80)
		expect(selectFillers()).toEqual([])
	})

	it('в обёртке — до замера первые 50 опций из 80, без распорок', () => {
		mount(Windowed, { kind: 'select', select: { items: items(80) } })

		expect(selectOptions()).toHaveLength(50)
		expect(selectFillers()).toEqual([])
	})

	it('`enabled: false` — все опции', () => {
		mount(Windowed, {
			kind: 'select',
			virtual: { enabled: false },
			select: { items: items(80) },
		})

		expect(selectOptions()).toHaveLength(80)
	})

	it('по замеру — распорки в списке панели: скрыты, высотой в опции; нарисованным — место в наборе', async () => {
		const engine = createEngineSelect({ items: items(200) })

		mount(Windowed, { kind: 'select', select: { engine } })
		await nextFrame()

		// Видны места 100–109: с запасом — 90–119
		engine.extensions.draw.notifyViewport({ top: 3000, bottom: 3300, step: 30 })
		flushSync()

		const list = document.querySelector('.so-select__list')

		if (!list) throw new Error('списка нет')

		expect(selectFillers().map((filler) => filler.getAttribute('aria-hidden'))).toEqual([
			'true',
			'true',
		])
		expect(
			selectFillers().map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual(['2700px', '2400px'])
		expect(list.firstElementChild).toBe(selectFillers()[0])
		expect(list.lastElementChild).toBe(selectFillers()[1])
		expect(selectOptions()).toHaveLength(30)
		expect(selectRow('Пункт 91').getAttribute('aria-setsize')).toBe('200')
		expect(selectRow('Пункт 91').getAttribute('aria-posinset')).toBe('91')
	})
})

describe('ListBox в окне — цикл Svelte', () => {
	/**
	 * Элементы и распорки — одной петлёй по ключу записи: элемент, который
	 * остался в окне, — тот же узел, хотя распорка перед ним сменилась.
	 */
	it('сдвиг окна не перемонтирует оставшийся элемент — тот же узел', () => {
		const engine = engineOf(200)

		mount(Windowed, { list: { engine } })

		measure(engine, 3000, 3300)

		const kept = optionOf('Пункт 101')

		// Окно ушло на десять мест вниз: места 100–129
		measure(engine, 3300, 3600)

		expect(optionOf('Пункт 91')).toBeUndefined()
		expect(optionOf('Пункт 130')).toBeDefined()
		expect(kept).toBeDefined()
		expect(optionOf('Пункт 101')).toBe(kept)
	})

	/**
	 * Движок снаружи живёт дольше монтирования: снятый список снимает окно с
	 * его рисования и отписывается от обёртки — выключатель живой обёртки до
	 * движка больше не доходит.
	 */
	it('снятие списка снимает окно с движка снаружи; выключатель его больше не трогает', () => {
		const engine = engineOf(80)
		const props = reactiveProps({ virtual: { enabled: true }, list: { engine }, listed: true })

		mount(Windowed, props)

		expect(options()).toHaveLength(50)
		expect(engine.extensions.draw.virtual).toBe(true)

		props.listed = false
		flushSync()

		expect(options()).toEqual([])
		expect(engine.extensions.draw.virtual).toBe(false)
		expect(engine.extensions.draw.drawn).toHaveLength(80)

		props.virtual = { enabled: false }
		flushSync()
		props.virtual = { enabled: true }
		flushSync()

		expect(engine.extensions.draw.virtual).toBe(false)
	})

	/** Вместо StrictMode React: снятая обёртка уносит с собой и список, и окно с движка. */
	it('снятие обёртки вместе со списком снимает окно с движка снаружи', () => {
		const engine = engineOf(80)
		const { destroy } = mount(Windowed, { list: { engine } })

		expect(engine.extensions.draw.virtual).toBe(true)

		destroy()

		expect(engine.extensions.draw.virtual).toBe(false)
		expect(engine.extensions.draw.drawn).toHaveLength(80)
	})

	/**
	 * Стрелка уводит подсветку к элементу, которого не было в документе:
	 * навигация закрепляет его в окне, окно его дорисовывает, а отметку
	 * навигация возвращает ему, когда его набор регистрируется в коллекции, — у
	 * Svelte это инициализация элемента.
	 */
	it('↑ с первого элемента — последний нарисован и отмечен подсветкой', async () => {
		const engine = engineOf(200)

		mount(Windowed, { list: { engine } })

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		// Видны места 0–9: с запасом — 0–19, последнего элемента в документе нет
		measure(engine, 0, 300)

		expect(optionOf('Пункт 200')).toBeUndefined()

		press(listRoot(), 'ArrowDown')

		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('true')

		press(listRoot(), 'ArrowUp')

		expect(optionRow('Пункт 200').getAttribute('data-highlighted')).toBe('true')
		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('false')
		// Между окном и последним — распорка на пропущенные
		expect(
			fillers().map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual([`${179 * 30}px`])
	})
})
