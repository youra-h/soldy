/**
 * Virtual под Web Components — окно `<so-virtual>` над ListBox на настоящей
 * разметке.
 *
 * Окно подхватывает коллекция внутри (`TVirtualCollectionExtension`), и список
 * рисует только видимые элементы, а на месте остальных — распорки под
 * `aria-hidden`. Что попадает в окно, решает ядро
 * (`core/__tests__/collection.draw.spec.ts`), замер — плагин
 * (`plugins/__tests__/virtual.plugin.spec.ts`); раскладки в jsdom нет, и замер
 * здесь подаётся рисованию движка снаружи руками. Сценарии — те же, что у Vue,
 * React, Solid и Svelte (`ui/react/__tests__/virtual.spec.tsx` и соседи), без
 * StrictMode и сервера; окно таблицы — «окно» в `table.spec.ts`.
 *
 * Своё у Web Components — элемент. У остальных адаптеров у обёртки узла нет, а
 * здесь он есть: автономный `<so-virtual>` без своей коробки, и список стоит в
 * нём светом. Окно его сборка опускает лифтом своему хосту, а список,
 * собираясь следом, находит его вверх по документу. Связка у элемента новая на
 * каждое подключение: список, вынутый из окна, собирается заново без окна, а
 * снятая обёртка уносит с собой и список, и окно с движка снаружи.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { createEngineListBox } from '@soldy-ui/core'
import type { TListBoxCollection } from '@soldy-ui/core'
import { VirtualDescriptor } from '@soldy-ui/setup'
import {
	TListBoxElement,
	TVirtualElement,
	type TListBoxElementProps,
	type TVirtualElementProps,
} from '@soldy-ui/webc'
import { virtualTemplate } from '../src/components/virtual/virtual.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** Отрисовка цепочкой: смена в ядре перерисовывает список, а тот — свои элементы. */
async function settle(): Promise<void> {
	for (let turn = 0; turn < 4; turn++) await flush()
}

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

function isVirtual(node: Element | null): node is TVirtualElementProps {
	return node instanceof TVirtualElement
}

function isList(node: Element | null): node is TListBoxElementProps {
	return node instanceof TListBoxElement
}

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
async function measure(engine: TListBoxCollection, top: number, bottom: number, step = 30) {
	engine.extensions.draw.notifyViewport({ top, bottom, step })
	await settle()
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

/** Узел списка в корне ListBox — в нём элементы и распорки, с него клавиши. */
function listRoot(root: ParentNode = document): HTMLElement {
	const node = root.querySelector('.so-list-box > .so-list-box__list')

	if (!(node instanceof HTMLElement)) throw new Error('списка нет')

	return node
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
async function press(target: Element, key: string): Promise<void> {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	await settle()
}

/** Окно `<so-virtual>` кодом: свойства — до вставки. */
function createVirtual(props: Record<string, unknown> = {}): TVirtualElementProps {
	const el = document.createElement('so-virtual')

	if (!isVirtual(el)) throw new Error('<so-virtual> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	return el
}

/** Список кодом: свойства — до вставки, свет — разметкой. */
function createList(props: Record<string, unknown>, light = ''): TListBoxElementProps {
	const el = document.createElement('div', { is: 'so-list-box' })

	if (!isList(el)) throw new Error('<div is="so-list-box"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	el.innerHTML = light

	return el
}

/** Список в окне — одной вставкой, как разметка страницы. */
async function inWindow(
	list: TListBoxElementProps,
	props: Record<string, unknown> = {},
): Promise<TVirtualElementProps> {
	const virtual = createVirtual(props)

	virtual.appendChild(list)
	document.body.appendChild(virtual)
	await settle()

	return virtual
}

describe('ListBox в окне', () => {
	it('без обёртки — все элементы, распорок нет', async () => {
		document.body.appendChild(createList({ items: items(80) }))
		await settle()

		expect(options()).toHaveLength(80)
		expect(fillers()).toEqual([])
	})

	it('в обёртке — до замера первые 50, без распорок', async () => {
		await inWindow(createList({ items: items(80) }))

		expect(options()).toHaveLength(50)
		expect(fillers()).toEqual([])
	})

	it('по замеру — распорки на месте пропущенных: скрыты, высотой в элементы, на своём месте', async () => {
		const engine = engineOf(200)

		await inWindow(createList({ engine }))

		// Видны места 100–109: с запасом — 90–119
		await measure(engine, 3000, 3300)

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

	it('нарисованным — размер набора и место в нём', async () => {
		const engine = engineOf(200)

		await inWindow(createList({ engine }))
		await measure(engine, 3000, 3300)

		const row = optionRow('Пункт 91')

		expect(row.getAttribute('aria-setsize')).toBe('200')
		expect(row.getAttribute('aria-posinset')).toBe('91')
	})

	it('`enabled` выключает и включает окно на лету', async () => {
		const virtual = await inWindow(createList({ items: items(80) }), { enabled: false })

		expect(options()).toHaveLength(80)
		expect(optionRow('Пункт 1').hasAttribute('aria-posinset')).toBe(false)

		virtual.enabled = true
		await settle()

		expect(options()).toHaveLength(50)
		expect(optionRow('Пункт 1').getAttribute('aria-posinset')).toBe('1')

		virtual.enabled = false
		await settle()

		expect(options()).toHaveLength(80)
	})

	/**
	 * Scope у слотов нет, и список в слоте элемента из данных — копия образца в
	 * каждом элементе: у внешнего в окне 50 элементов, и в каждом свой пустой
	 * список. Наполненный вложенный список окна не наследует: внешний опустил
	 * своему поддереву пустое подключение.
	 */
	it('список в слоте элемента окна не наследует', async () => {
		const outer = createList(
			{ items: items(60) },
			'<template slot="item"><div is="so-list-box" class="inner"></div></template>',
		)

		await inWindow(outer)

		const inner = outer.querySelector('.inner')

		if (!isList(inner)) throw new Error('вложенного списка нет')

		inner.items = items(55)
		await settle()

		expect(options(inner)).toHaveLength(55)
		// У внешнего — окно: 50 своих элементов и 55 вложенного внутри первого
		expect(options(outer)).toHaveLength(50 + 55)
	})
})

describe('ListBox в окне — элемент Web Components', () => {
	/**
	 * Своего узла у обёртки в остальных адаптерах нет, а у `<so-virtual>` есть —
	 * без коробки: теневой корень несёт только `<slot>` и `:host { display:
	 * contents }`, и список остаётся его светом.
	 */
	it('<so-virtual> — автономный элемент без коробки, список — его свет', async () => {
		const list = createList({ items: items(3) })
		const virtual = await inWindow(list)
		const shadow = virtual.shadowRoot

		expect(customElements.get('so-virtual')).toBe(TVirtualElement)
		expect(virtual.localName).toBe('so-virtual')
		expect(virtual.hasAttribute('is')).toBe(false)
		expect(list.parentElement).toBe(virtual)
		expect(shadow?.querySelector('style')?.textContent).toContain('display: contents')
		expect(shadow?.querySelector('slot')).not.toBeNull()
		// Невизуальный компонент: ни классов, ни наборов база на него не кладёт
		expect(virtual.getAttributeNames()).toEqual([])
	})

	/** Разметка страницы: окно и список в ней — одной вставкой `innerHTML`. */
	it('окно в разметке — список в нём рисует окно', async () => {
		const host = document.createElement('div')

		host.innerHTML = `<so-virtual><div is="so-list-box"></div></so-virtual>`

		const list = host.querySelector('[is="so-list-box"]')

		if (!isList(list)) throw new Error('списка нет')

		list.items = items(80)
		document.body.appendChild(host)
		await settle()

		expect(options()).toHaveLength(50)
	})

	/**
	 * Элементы и распорки — одной петлёй по ключу записи: элемент, который
	 * остался в окне, — тот же узел, хотя распорка перед ним сменилась.
	 */
	it('сдвиг окна не перестраивает оставшийся элемент — тот же узел', async () => {
		const engine = engineOf(200)

		await inWindow(createList({ engine }))
		await measure(engine, 3000, 3300)

		const kept = optionOf('Пункт 101')

		// Окно ушло на десять мест вниз: места 100–129
		await measure(engine, 3300, 3600)

		expect(optionOf('Пункт 91')).toBeUndefined()
		expect(optionOf('Пункт 130')).toBeDefined()
		expect(kept).toBeDefined()
		expect(optionOf('Пункт 101')).toBe(kept)
	})

	/**
	 * Движок снаружи живёт дольше подключения: снятая обёртка уносит с собой
	 * список, его связка уходит и снимает окно с рисования движка.
	 */
	it('снятие обёртки снимает окно с движка снаружи', async () => {
		const engine = engineOf(80)
		const virtual = await inWindow(createList({ engine }))

		expect(engine.extensions.draw.virtual).toBe(true)

		virtual.remove()

		expect(engine.extensions.draw.virtual).toBe(false)
		expect(engine.extensions.draw.drawn).toHaveLength(80)
	})

	/**
	 * Список, переставленный из обёртки, собирается заново — уже без окна над
	 * собой: окно снято с движка, и выключатель обёртки его больше не трогает.
	 * Вставленный обратно — снова в окне.
	 */
	it('список, переставленный из обёртки, окно теряет; вставленный обратно — снова в окне', async () => {
		const engine = engineOf(80)
		const list = createList({ engine })
		const virtual = await inWindow(list)

		document.body.appendChild(list)
		await settle()

		expect(engine.extensions.draw.virtual).toBe(false)
		expect(options()).toHaveLength(80)

		virtual.enabled = false
		virtual.enabled = true
		await settle()

		expect(engine.extensions.draw.virtual).toBe(false)

		virtual.appendChild(list)
		await settle()

		expect(engine.extensions.draw.virtual).toBe(true)
		expect(options()).toHaveLength(50)
	})

	/**
	 * Стрелка уводит подсветку к элементу, которого не было в документе:
	 * навигация закрепляет его в окне, окно его дорисовывает, а отметку
	 * навигация возвращает ему, когда его набор регистрируется в коллекции, — у
	 * Web Components это подключение элемента.
	 */
	it('↑ с первого элемента — последний нарисован и отмечен подсветкой', async () => {
		const engine = engineOf(200)

		await inWindow(createList({ engine }))

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		// Видны места 0–9: с запасом — 0–19, последнего элемента в документе нет
		await measure(engine, 0, 300)

		expect(optionOf('Пункт 200')).toBeUndefined()

		await press(listRoot(), 'ArrowDown')

		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('true')

		await press(listRoot(), 'ArrowUp')

		expect(optionRow('Пункт 200').getAttribute('data-highlighted')).toBe('true')
		expect(optionRow('Пункт 1').getAttribute('data-highlighted')).toBe('false')
		// Между окном и последним — распорка на пропущенные
		expect(
			fillers().map((filler) => filler.style.getPropertyValue('--so-filler-height')),
		).toEqual([`${179 * 30}px`])
	})
})

describe('шаблон объявляет ровно те слоты, что и дескриптор', () => {
	it('Virtual', () => {
		const root = document.createElement('so-virtual')
		const targets = virtualTemplate.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
			VirtualDescriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('типы', () => {
	it('выключатель — свойство элемента', () => {
		expectTypeOf<TVirtualElementProps['enabled']>().toEqualTypeOf<boolean | undefined>()
		expectTypeOf<TVirtualElementProps>().toExtend<HTMLElement>()
	})
})
