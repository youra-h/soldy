/**
 * ListBox под Web Components — список с выбором на движке коллекций.
 *
 * Сценарии — те же, что у Angular (`list-box.spec.ts`), React и Vue, без
 * сервера: выбор, состав, отметка и слоты. Движок коллекций, его расширения и
 * плагины перенесены без правок.
 *
 * Своё у Web Components — разметка. Корень списка и элемента — элемент
 * потребителя (`<div is="so-list-box">`, `<div is="so-list-box-item">`), а
 * строка элемента — Button на `div`, `<div is="so-button-div">`: одно имя
 * элемента расширяет один тег, и кнопку на `div` регистрирует фабрика кнопки.
 * На `div` у выключенного пункта остаются фокус и клик, а ядро пишет строке
 * ARIA, рассчитанную на `div`. Атрибуты потребителя у элемента делятся между
 * корнем и строкой. Элемент входит в коллекцию, когда собирается: движок
 * списка он находит лифтом вверх по документу. Слоты элемента — свет строки
 * (свет детали). Scope у слотов нет: слоты элементов из данных — образцы
 * (`<template slot="item-leading">`), копию которых получает каждый элемент.
 * Отрисовка — микрозадачей после смены ядра, слушатели плагинов — кадром позже.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import {
	TWindowStrategy,
	createEngineListBox,
	type TListBoxCollection,
	type TListBoxValue,
	type TSelectionMode,
	type TValuePayload,
} from '@soldy-ui/core'
import { ListBoxDescriptor, ListBoxGroupDescriptor, ListBoxItemDescriptor } from '@soldy-ui/setup'
import {
	TListBoxElement,
	TListBoxGroupElement,
	TListBoxItemElement,
	defineElement,
	registerButtonTag,
	type ITemplate,
	type TButtonElementProps,
	type TListBoxElementProps,
	type TListBoxItemElementProps,
} from '@soldy-ui/webc'
import { listBoxTemplate } from '../src/components/list-box/list-box.template'
import { listBoxItemTemplate } from '../src/components/list-box/item/list-box-item.template'
import { listBoxGroupTemplate } from '../src/components/list-box/group/list-box-group.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
	{ value: 'c', text: 'Третий' },
]

/** Строка элемента — Button на `div`. */
const TButtonDivElement = registerButtonTag('div')

function isList(node: Element | null): node is TListBoxElementProps {
	return node instanceof TListBoxElement
}

function isItem(node: Element | null): node is TListBoxItemElementProps {
	return node instanceof TListBoxItemElement
}

function isRow(node: Element | null): node is TButtonElementProps<HTMLDivElement> {
	return node instanceof TButtonDivElement
}

/** Строки элементов — на них обработчик выбора, `aria-selected` и `tabindex`. */
const rows = (): TButtonElementProps<HTMLDivElement>[] =>
	[...document.querySelectorAll('.so-list-box-item .so-button')].filter(isRow)

/** Строка элемента по тексту; нет её — тест падает здесь. */
function rowOf(text: string): TButtonElementProps<HTMLDivElement> {
	const row = rows().find((candidate) => candidate.textContent?.trim() === text)

	if (!row) throw new Error(`строки элемента «${text}» нет`)

	return row
}

/** Элемент списка по тексту строки; нет его — тест падает здесь. */
function itemOf(text: string): TListBoxItemElementProps {
	const item = rowOf(text).closest('.so-list-box-item')

	if (!isItem(item)) throw new Error(`элемента «${text}» нет`)

	return item
}

/** `aria-selected` всех строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

const listItems = () => [...document.querySelectorAll('.so-list-box-item')]

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Разметка, подключённая к документу, и её отрисовка. */
async function mount(html: string): Promise<HTMLElement> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	await flush()

	return host
}

/** Список в разметке; нет его — тест падает здесь. */
function listIn(host: ParentNode): TListBoxElementProps {
	const node = host.querySelector('[is="so-list-box"]')

	if (!isList(node)) throw new Error('<div is="so-list-box"> нет')

	return node
}

/**
 * Узел списка в корне — шаблона: на нём набор `aria` списка и остановка Tab,
 * в нём элементы, распорки окна и `empty`.
 */
const nodeOf = (list: Element): HTMLElement =>
	find(list, ':scope > .so-list-box__list', HTMLElement)

/** Список кодом: пропсы свойствами и свет — до вставки. */
async function mountList(
	props: Record<string, unknown>,
	light = '',
): Promise<TListBoxElementProps> {
	const el = document.createElement('div', { is: 'so-list-box' })

	if (!isList(el)) throw new Error('<div is="so-list-box"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	el.innerHTML = light
	document.body.appendChild(el)
	await flush()

	return el
}

/** Клик и отрисовка того, что он поменял. */
async function click(element: HTMLElement): Promise<void> {
	element.click()
	await flush()
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
async function press(target: Element, key: string): Promise<void> {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	await flush()
}

/** Значения `so:change:value` списка — в порядке прихода. */
function collectValues(list: Element): TValuePayload<TListBoxValue>[] {
	const seen: TValuePayload<TListBoxValue>[] = []

	list.addEventListener('so:change:value', (event) => {
		if (event instanceof CustomEvent && event.target === list) seen.push(event.detail)
	})

	return seen
}

/** Два элемента разметки в `multiple` — как харнесс Angular. */
const HARNESS = `<div is="so-list-box" mode="multiple">
	<div is="so-list-box-item" value="a" text="A"></div>
	<div is="so-list-box-item" value="b" text="B"></div>
</div>`

describe('выбор', () => {
	it('элементы разметки входят в коллекцию в порядке DOM', async () => {
		const list = listIn(
			await mount(`<div is="so-list-box">
				<div is="so-list-box-item" value="a" text="A"></div>
				<div is="so-list-box-item" value="b" text="B"></div>
				<div is="so-list-box-item" value="c" text="C"></div>
			</div>`),
		)

		expect(list.state.items?.map((item) => item.value)).toEqual(['a', 'b', 'c'])
	})

	it('клик по строке выбирает элемент, повторный — снимает, so:change:value сообщает', async () => {
		const list = listIn(await mount(HARNESS))
		const changes = collectValues(list)

		await click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
		expect(changes.at(-1)?.newValue).toEqual(['b'])

		await click(rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])
		expect(changes).toHaveLength(2)
	})

	/**
	 * Отметку элемента сообщает его событие: `so:change:selected` приходит
	 * только элементу, чья отметка сменилась, и `detail` у него — новая
	 * отметка. У события списка `so:change:selection` аргументов ядра два, и
	 * `detail` — их пара: выбранные и элементы, чья отметка сменилась.
	 */
	it('so:change:selected — элементу, чья отметка сменилась, с отметкой; so:change:selection — пара', async () => {
		const list = listIn(
			await mount(`<div is="so-list-box">
				<div is="so-list-box-item" value="a" text="A" selected></div>
				<div is="so-list-box-item" value="b" text="B"></div>
				<div is="so-list-box-item" value="c" text="C"></div>
			</div>`),
		)
		const marks: string[] = []
		const details: unknown[] = []

		for (const text of ['A', 'B', 'C']) {
			const item = itemOf(text)

			item.addEventListener('so:change:selected', (event) => {
				if (event instanceof CustomEvent && event.target === item) {
					marks.push(`${text}: ${String(event.detail)}`)
				}
			})
		}

		list.addEventListener('so:change:selection', (event) => {
			if (event instanceof CustomEvent && event.target === list) details.push(event.detail)
		})

		await click(rowOf('B'))

		expect(marks).toEqual(['A: false', 'B: true'])
		expect(details).toEqual([
			[[itemOf('B').ctrl], new Set([itemOf('A').ctrl, itemOf('B').ctrl])],
		])
	})

	/**
	 * Выключенный элемент кликом не выбирается — выключен ли он сам или весь
	 * список. Включённый обратно — выбирается тем же кликом: так видно, что
	 * обработчик на месте и отказ даёт именно выключенность.
	 */
	it.each([
		['выключен сам', (_host: HTMLElement) => itemOf('B')],
		['выключен список', (host: HTMLElement) => listIn(host)],
	] as const)('%s: клик не выбирает, после включения — выбирает', async (_way, target) => {
		const host = await mount(HARNESS)
		const off = target(host)

		off.disabled = true
		await flush()

		expect(rowOf('B').dataset['disabled']).toBe('true')

		await click(rowOf('B'))

		expect(selection()).toEqual(['false', 'false'])

		off.disabled = false
		await flush()
		await click(rowOf('B'))

		expect(selection()).toEqual(['false', 'true'])
	})

	/**
	 * Roving tabindex (APG listbox): Tab фокусирует узел списка, а по элементам
	 * ходят стрелки. `tabindex="-1"` элемента пишет ядро в его `aria`, и на
	 * строке он перекрывает `tabindex="0"`, который кнопка на `div` ставит себе
	 * сама: набор владельца главнее. Корень — рамка вокруг шапки, списка и
	 * подвала, остановкой он не бывает.
	 */
	it('строки — не остановки Tab, узел списка — остановка, корень — нет', async () => {
		const list = listIn(await mount(HARNESS))

		expect(nodeOf(list).getAttribute('tabindex')).toBe('0')
		expect(list.hasAttribute('tabindex')).toBe(false)
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
	})

	/**
	 * Роль списка пишет ядро, `aria-multiselectable` в `multiple` — коллекция;
	 * оба на узел списка кладёт шаблон набором `aria`, а база на корень его не
	 * кладёт. Роль строки — в «строка — кнопка на div».
	 */
	it('узел списка — listbox, в multiple — с aria-multiselectable; у корня роли нет', async () => {
		const list = listIn(await mount(HARNESS))

		expect(nodeOf(list).getAttribute('role')).toBe('listbox')
		expect(nodeOf(list).getAttribute('aria-multiselectable')).toBe('true')
		expect(list.hasAttribute('role')).toBe(false)
		expect(list.hasAttribute('aria-multiselectable')).toBe(false)
	})

	it('стрелки ведут подсветку, Enter и пробел переключают выбор', async () => {
		const list = listIn(await mount(HARNESS))

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await nextFrame()

		await press(nodeOf(list), 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['true', 'false'])

		await press(nodeOf(list), 'Enter')

		expect(selection()).toEqual(['true', 'false'])

		await press(nodeOf(list), 'ArrowDown')
		await press(nodeOf(list), ' ')

		expect(selection()).toEqual(['true', 'true'])
	})

	/**
	 * В `listbox` ARIA пускает только опции, поэтому шапка и подвал — дети
	 * корня рядом с узлом списка. Их клавиши — не списка: поле печатает,
	 * кнопка нажимается.
	 */
	it('шапка и подвал — вне listbox; их клавиши подсветку не двигают', async () => {
		const list = listIn(
			await mount(`<div is="so-list-box">
				<input slot="header" class="so-test-header" />
				<div is="so-list-box-item" value="a" text="A"></div>
				<button slot="footer" class="so-test-footer">Готово</button>
			</div>`),
		)

		await nextFrame()

		const header = find(list, '.so-test-header', HTMLInputElement)
		const footer = find(list, '.so-test-footer', HTMLButtonElement)

		expect([...list.children]).toEqual([header, nodeOf(list), footer])
		expect(nodeOf(list).contains(header)).toBe(false)
		expect(nodeOf(list).contains(footer)).toBe(false)

		await press(header, 'ArrowDown')
		await press(footer, 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['false'])
	})

	/** Клавиша со строки, на которой фокус остался после клика, — тоже списка. */
	it('стрелка со строки под фокусом ведёт подсветку', async () => {
		await mount(HARNESS)
		await nextFrame()

		rowOf('A').focus()
		await press(rowOf('A'), 'ArrowDown')

		expect(rows().map((row) => row.getAttribute('data-highlighted'))).toEqual(['true', 'false'])
	})
})

/**
 * Атрибуты потребителя делятся, как у поля: класс и стиль — корню-рамке,
 * статические атрибуты разметки — узлу списка, где роль `listbox`. Имя и `id`
 * называют список, а не рамку без роли.
 */
describe('атрибуты потребителя — узлу списка', () => {
	it('aria-label, id и data-* — на [role=listbox], не на корне; класс и стиль — на корне', async () => {
		const list = listIn(
			await mount(`<div
				is="so-list-box"
				aria-label="Города"
				id="cities"
				data-testid="list"
				class="mine"
				style="color: red"
			>
				<div is="so-list-box-item" value="a" text="A"></div>
			</div>`),
		)
		const node = find(list, '[role="listbox"]', HTMLDivElement)

		expect(node).toBe(nodeOf(list))
		expect(node.getAttribute('aria-label')).toBe('Города')
		expect(node.id).toBe('cities')
		expect(node.dataset['testid']).toBe('list')
		expect(
			['aria-label', 'id', 'data-testid'].filter((name) => list.hasAttribute(name)),
		).toEqual([])
		expect(list.classList.contains('mine')).toBe(true)
		expect(list.style.color).toBe('red')
		expect(node.classList.contains('mine')).toBe(false)
	})

	it('tabindex="-1" снимает список с остановок Tab', async () => {
		const list = listIn(
			await mount(`<div is="so-list-box" tabindex="-1">
				<div is="so-list-box-item" value="a" text="A"></div>
			</div>`),
		)

		expect(nodeOf(list).getAttribute('tabindex')).toBe('-1')
		expect(list.hasAttribute('tabindex')).toBe(false)
	})

	it('dir от direction — на корне', async () => {
		const list = await mountList({ items: ITEMS, direction: 'rtl' })

		expect(list.getAttribute('dir')).toBe('rtl')
		expect(nodeOf(list).hasAttribute('dir')).toBe(false)
	})
})

/**
 * Строка — Button на `div`: на `<button>` выключенный пункт терял бы фокус и
 * клик, а ядро пишет строке ARIA под `div` (`TListBoxItem._ariaTag`).
 */
describe('строка — кнопка на div', () => {
	it('строка — <div is="so-button-div"> с именем места, своего type у неё нет', async () => {
		await mount(HARNESS)

		const row = rowOf('A')

		expect(row).toBeInstanceOf(HTMLDivElement)
		expect(row.getAttribute('embedded')).toBe('list-box.row')
		expect(row.hasAttribute('type')).toBe(false)
		expect(row.parentElement).toBe(itemOf('A'))
	})

	/**
	 * Роль и остановку Tab кнопка на `div` пишет себе сама, а набор элемента —
	 * `role="option"` элемента, `tabindex` и `aria-selected` списка — ложится
	 * поверх: строка и есть опция, и кнопкой себя не объявляет.
	 */
	it('роль, tabindex и aria-selected — элемента: строка — опция', async () => {
		await mount(HARNESS)

		const row = rowOf('A')

		expect(row.getAttribute('role')).toBe('option')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.getAttribute('aria-selected')).toBe('false')
		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
	})

	it('выключенный пункт: aria-disabled без disabled, фокус на нём остаётся', async () => {
		await mount(`<div is="so-list-box">
			<div is="so-list-box-item" value="a" text="A"></div>
			<div is="so-list-box-item" value="b" text="B" disabled></div>
		</div>`)

		const row = rowOf('B')

		expect(row.getAttribute('aria-disabled')).toBe('true')
		expect(row.hasAttribute('disabled')).toBe(false)
		expect(row.getAttribute('tabindex')).toBe('-1')

		row.focus()

		expect(document.activeElement).toBe(row)
	})

	/** Кнопка формы рядом отправляет её тем же кликом: проверка видит отправку. */
	it('в форме клик по строке форму не отправляет', async () => {
		const host = await mount(`<form>
			<div is="so-list-box">
				<div is="so-list-box-item" value="a" text="A"></div>
			</div>
			<button is="so-button" text="Отправить"></button>
		</form>`)
		const form = find(host, 'form', HTMLFormElement)
		let submits = 0

		form.addEventListener('submit', (event) => {
			event.preventDefault()
			submits++
		})

		await click(rowOf('A'))

		expect(submits).toBe(0)
		expect(selection()).toEqual(['true'])

		await click(find(form, 'button', HTMLButtonElement))

		expect(submits).toBe(1)
	})

	it('кнопка на div — один класс на тег, под именем so-button-div', () => {
		expect(registerButtonTag('div')).toBe(TButtonDivElement)
		expect(customElements.get('so-button-div')).toBe(TButtonDivElement)
	})
})

describe('состав', () => {
	it('список из items рисует элемент на каждый', async () => {
		await mountList({ items: ITEMS })

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Первый', 'Второй', 'Третий'])
	})

	/**
	 * Фасад собирается конструктором из тех же пропсов, и `items` он уже
	 * записал: связка второй раз их не пишет. Сеттер `items` без `trackBy` —
	 * это очистка и новый набор.
	 */
	it('items пишется один раз: без очистки и повторного добавления', async () => {
		const engine = createEngineListBox()
		let resets = 0
		let added = 0

		engine.extensions.plain.events.on('reset', () => resets++)
		engine.extensions.plain.events.on('item:added', () => added++)

		await mountList({ engine, items: ITEMS })

		expect(resets).toBe(0)
		expect(added).toBe(ITEMS.length)
		expect(rows()).toHaveLength(ITEMS.length)
	})

	it('engine снаружи: элементы движка рисуются, добавленное в него — тоже', async () => {
		const engine = createEngineListBox({ items: ITEMS.slice(0, 2) })

		await mountList({ engine })

		expect(listItems()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'Третий' }])
		await flush()

		expect(listItems()).toHaveLength(3)
	})

	it('value списка выбирает элемент, и выбор следует за ним', async () => {
		const list = await mountList({ items: ITEMS })

		list.value = 'b'
		await flush()

		expect(selection()).toEqual(['false', 'true', 'false'])

		list.value = 'c'
		await flush()

		expect(selection()).toEqual(['false', 'false', 'true'])
	})

	it('сузили shown — на экране меньше элементов, в коллекции все', async () => {
		const engine = createEngineListBox({ items: ITEMS })

		await mountList({ engine })

		engine.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((item) => item.value !== 'b')
		})
		engine.getCore().driver.invalidateQuery()
		await flush()

		expect(listItems()).toHaveLength(2)
		expect(engine.extensions.batch.items).toHaveLength(3)
	})

	/**
	 * Пропсы фасада — `mode`, `items`, `engine` у списка — свойства того же
	 * элемента, атрибутами в DOM их не пишут. Атрибуты потребителя остаются: у
	 * списка — на узле списка, у элемента — на строке.
	 */
	it('пропсы фасада — свойства, не атрибуты; атрибуты потребителя — атрибуты', async () => {
		const list = await mountList({ items: ITEMS, mode: 'multiple', title: 'Города' })

		for (const name of ['mode', 'items', 'engine']) {
			expect(list.hasAttribute(name), name).toBe(false)
			expect(nodeOf(list).hasAttribute(name), name).toBe(false)
		}

		expect(list.hasAttribute('title')).toBe(false)
		expect(nodeOf(list).getAttribute('title')).toBe('Города')
		expect(list.state.mode).toBe('multiple')
		expect(list.items).toEqual(list.state.items)
	})

	it('selected элемента разметки выбирает его при входе в коллекцию', async () => {
		await mount(`<div is="so-list-box">
			<div is="so-list-box-item" value="a" text="A"></div>
			<div is="so-list-box-item" value="b" text="B" selected title="Строка"></div>
		</div>`)

		expect(selection()).toEqual(['false', 'true'])
		expect(rowOf('B').hasAttribute('selected')).toBe(false)
		expect(rowOf('B').getAttribute('title')).toBe('Строка')
	})

	it('класс и стиль потребителя — корню элемента, id, title, aria-label и data-* — строке', async () => {
		await mount(`<div is="so-list-box">
			<div
				is="so-list-box-item"
				value="a"
				text="A"
				class="mine"
				style="color: red"
				id="row-a"
				title="Пункт"
				aria-label="Пункт А"
				data-testid="item"
			></div>
		</div>`)

		const item = itemOf('A')
		const row = rowOf('A')

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.style.color).toBe('red')
		expect(
			['id', 'title', 'aria-label', 'data-testid'].filter((name) => item.hasAttribute(name)),
		).toEqual([])
		expect(row.id).toBe('row-a')
		expect(row.getAttribute('title')).toBe('Пункт')
		expect(row.getAttribute('aria-label')).toBe('Пункт А')
		expect(row.dataset['testid']).toBe('item')
		expect(row.classList.contains('mine')).toBe(false)
	})

	it('клик потребителя по элементу не отменяет выбор', async () => {
		await mount(`<div is="so-list-box">
			<div is="so-list-box-item" value="a" text="A"></div>
		</div>`)

		const clicks: string[] = []

		itemOf('A').addEventListener('click', (event) => clicks.push(event.type))
		await click(rowOf('A'))

		expect(clicks).toEqual(['click'])
		expect(selection()).toEqual(['true'])
	})

	/** Место элемента в коллекции — стилем корня: ряд — флексбокс. */
	it('корень элемента стоит по месту в коллекции', async () => {
		await mountList({ items: ITEMS })

		expect(
			listItems().map((item) => (item instanceof HTMLElement ? item.style.order : '')),
		).toEqual(['0', '1', '2'])
	})

	/** Тема читает `data-content-fit` с корня элемента, а выбор и подсветку — со строки. */
	it('dataset элемента — и на корне, и на строке', async () => {
		await mountList({ items: ITEMS, value: 'a', contentFit: 'wrap' })

		const [first] = listItems()
		const [row] = rows()

		expect(first.getAttribute('data-content-fit')).toBe('wrap')
		expect(first.getAttribute('data-selected')).toBe('true')
		expect(row.getAttribute('data-content-fit')).toBe('wrap')
		expect(row.getAttribute('data-selected')).toBe('true')
	})

	/** Элемент из данных — элемент своей коллекции, а не деталь: признака места у него нет. */
	it('элемент из данных без embedded', async () => {
		await mountList({ items: ITEMS })

		expect(listItems().some((node) => node.hasAttribute('embedded'))).toBe(false)
	})

	/**
	 * Событие элемента всплывает, только если элемент написал потребитель.
	 * Элемент из данных построил шаблон списка (`createItem`) — это разметка
	 * списка, и его события слышно на нём самом, а выбор приложению сообщает
	 * список (`so:change:value`). Элемент разметки написал потребитель, и его
	 * события всплывают. В одном списке двух видов не бывает — петля из данных
	 * рисует, только когда элементов разметки нет, — поэтому списки стоят рядом,
	 * под общим слушателем.
	 */
	it('событие элемента из данных не всплывает, элемента разметки — всплывает', async () => {
		/** События элемента: сборка, узел и выбор — событие фасада коллекции. */
		const names = ['so:bundle:create', 'so:element:ready', 'so:change:selected']
		const host = document.createElement('div')
		const data = document.createElement('div', { is: 'so-list-box' })
		const bubbled: string[] = []
		const onDrawn = new Set<string>()

		if (!isList(data)) throw new Error('<div is="so-list-box"> нет')

		host.innerHTML = `<div is="so-list-box">
			<div is="so-list-box-item" value="a" text="Разметка"></div>
		</div>`
		data.items = [{ value: 'b', text: 'Данные' }]
		host.append(data)

		for (const name of names) {
			host.addEventListener(name, ({ target }) => {
				if (target instanceof Element && isItem(target)) {
					bubbled.push(`${target.ctrl?.text}: ${name}`)
				}
			})
		}

		document.body.appendChild(host)

		// Элемент из данных шаблон строит при сборке списка, а набор и узел он
		// объявляет позже: микрозадачей и кадром
		const drawn = data.querySelector('.so-list-box-item')

		if (!drawn) throw new Error('элемента из данных нет')

		for (const name of names) drawn.addEventListener(name, () => onDrawn.add(name))

		await nextFrame()
		await click(rowOf('Разметка'))
		await click(rowOf('Данные'))

		expect([...onDrawn].sort()).toEqual([...names].sort())
		expect(bubbled.sort()).toEqual(names.map((name) => `Разметка: ${name}`).sort())
	})

	/**
	 * Петля по ключу: запись новая на каждую смену, а элемент — тот же, пока
	 * жив его ключ (`uid`). Переставленный едет переносом силами базы и не
	 * пересобирается, ушедший снимается. События элемента из данных не
	 * всплывают, поэтому сборки элементов слушатель ловит в фазе захвата.
	 */
	it('перестановка и удаление в движке: живые элементы — те же узлы, порядок DOM — порядок данных', async () => {
		const engine = createEngineListBox({ items: ITEMS })
		const list = await mountList({ engine })
		const before = new Map(
			listItems().map((node) => [node.querySelector('.so-button')?.textContent, node]),
		)
		const [a, b, c] = engine.extensions.batch.items
		const bundles: unknown[] = []

		list.addEventListener('so:bundle:create', (event) => bundles.push(event.target), {
			capture: true,
		})
		engine.extensions.plain.move(c, 0)
		engine.extensions.plain.remove(b)
		await flush()

		expect(engine.extensions.batch.shown).toEqual([c, a])
		expect(rows().map((row) => row.textContent)).toEqual(['Третий', 'Первый'])
		expect(listItems()).toEqual([before.get('Третий'), before.get('Первый')])
		expect(before.get('Второй')?.isConnected).toBe(false)
		// Переставленные не пересобраны: наборов плагинов заново никто не создал
		expect(bundles).toEqual([])
	})

	/**
	 * Список в слоте элемента — свой: его элементы входят в его коллекцию, а не
	 * во внешнюю. Списки помечены классом: `id` разметки списка уезжает на его
	 * узел списка.
	 */
	it('список в строке элемента: элементы входят каждый в свой список', async () => {
		const host = await mount(`<div is="so-list-box" class="outer">
			<div is="so-list-box-item" value="a" text="A">
				<div is="so-list-box" class="inner">
					<div is="so-list-box-item" value="x" text="X"></div>
					<div is="so-list-box-item" value="y" text="Y"></div>
				</div>
			</div>
			<div is="so-list-box-item" value="b" text="B"></div>
		</div>`)
		const outer = listIn(host)
		const inner = host.querySelector('.inner')

		if (!isList(inner)) throw new Error('внутреннего списка нет')

		expect(outer.state.items?.map((item) => item.value)).toEqual(['a', 'b'])
		expect(inner.state.items?.map((item) => item.value)).toEqual(['x', 'y'])
	})
})

describe('отметка выбранного и слоты', () => {
	/** Отметки по элементам: своя иконка, слот или пусто. */
	const marks = () =>
		[...document.querySelectorAll('.so-list-box-item__indicator')].map((indicator) =>
			indicator.querySelector('.probe')
				? 'slot'
				: indicator.querySelector('.so-icon')
					? 'icon'
					: 'empty',
		)

	it('без indicator обёртки отметки нет', async () => {
		await mountList({ items: ITEMS, value: 'a' })

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Обёртка стоит у всех, включая невыбранных: она резервирует место, иначе
	 * строки прыгали бы при выборе. Иконка внутри — только у выбранного.
	 */
	it('обёртка — у каждого элемента, иконка — у выбранного, из дерева доступности убрана', async () => {
		await mountList({ items: ITEMS, indicator: 'start' })

		expect(marks()).toEqual(['empty', 'empty', 'empty'])

		await click(rowOf('Второй'))

		expect(marks()).toEqual(['empty', 'icon', 'empty'])
		expect(
			find(document, '.so-list-box-item__indicator', HTMLElement).getAttribute('aria-hidden'),
		).toBe('true')

		await click(rowOf('Второй'))

		expect(marks()).toEqual(['empty', 'empty', 'empty'])
	})

	it('иконка отметки — деталь с именем места, роли check и размера списка', async () => {
		await mountList({ items: ITEMS, indicator: 'start', value: 'a', size: 'lg' })

		const icon = find(document, '.so-list-box-item__indicator .so-icon', HTMLElement)

		expect(icon.getAttribute('embedded')).toBe('list-box.indicator')
		expect(icon.getAttribute('icon')).toBe('check')
		expect(icon.classList.contains('so-icon--size-lg')).toBe(true)
	})

	it('start ставит отметку перед текстом, end — после, none убирает', async () => {
		const list = await mountList({ items: ITEMS.slice(0, 1), indicator: 'start', value: 'a' })
		const sideOf = () => {
			const indicator = find(document, '.so-list-box-item__indicator', HTMLElement)
			const text = find(document, '.so-button__text', HTMLElement)

			return indicator.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING
				? 'start'
				: 'end'
		}

		expect(sideOf()).toBe('start')
		expect(rows()[0].firstElementChild?.className).toBe('so-list-box-item__indicator')

		list.indicator = 'end'
		await flush()

		expect(sideOf()).toBe('end')
		expect(rows()[0].lastElementChild?.className).toBe('so-list-box-item__indicator')
		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(1)

		list.indicator = 'none'
		await flush()

		expect(document.querySelectorAll('.so-list-box-item__indicator')).toHaveLength(0)
	})

	/**
	 * Scope у слотов нет: `indicator-icon` — отметка выбранного, как своя
	 * иконка, и привязка выводит его только у выбранного элемента.
	 */
	it('слот indicator-icon подменяет иконку и выводится у выбранного', async () => {
		await mount(`<div is="so-list-box" indicator="start">
			<div is="so-list-box-item" value="a" text="A"><b slot="indicator-icon" class="custom">V</b></div>
		</div>`)

		expect(document.querySelector('.custom')).toBeNull()
		// Слот отметки — не содержимое строки: текст элемента на месте
		expect(rowOf('A').textContent?.trim()).toBe('A')

		await click(rowOf('A'))

		expect(document.querySelector('.so-list-box-item__indicator .custom')).not.toBeNull()
		expect(document.querySelector('.so-list-box-item__indicator .so-icon')).toBeNull()

		// Текст отметки входит в текст строки — строку берём по месту
		await click(rows()[0])

		expect(document.querySelector('.custom')).toBeNull()
	})

	it('default элемента — свет строки вместо text', async () => {
		await mount(`<div is="so-list-box">
			<div is="so-list-box-item" value="b" text="B"></div>
			<div is="so-list-box-item" value="c" text="C"><b>Свой</b></div>
		</div>`)

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['B', 'Свой'])
		expect(find(rowOf('Свой'), '.so-button__text b', HTMLElement).textContent).toBe('Свой')
	})

	/** Края — свет строки вокруг текста, а отметка — крайняя: перед `leading` и после `trailing`. */
	it('leading и trailing — края строки, отметка — снаружи от них', async () => {
		const list = listIn(
			await mount(`<div is="so-list-box" indicator="start" value="a">
				<div is="so-list-box-item" value="a" text="A">
					<i slot="trailing" class="tail">!</i>
					<i slot="leading" class="head">*</i>
				</div>
			</div>`),
		)
		const parts = () => [...rows()[0].children].map((node) => node.className)

		expect(parts()).toEqual(['so-list-box-item__indicator', 'head', 'so-button__text', 'tail'])

		list.indicator = 'end'
		await flush()

		expect(parts()).toEqual(['head', 'so-button__text', 'tail', 'so-list-box-item__indicator'])
	})

	it('шапка и подвал — над и под узлом списка, empty — в нём, пока элементов нет', async () => {
		const list = await mountList(
			{ items: [] },
			`<i slot="header" class="head"></i>
			<p slot="empty" class="probe">Пусто</p>
			<i slot="footer" class="foot"></i>`,
		)

		expect([...list.children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...nodeOf(list).children].map((child) => child.className)).toEqual(['probe'])

		list.items = ITEMS.slice(0, 2)
		await flush()

		expect(document.querySelector('.probe')).toBeNull()
		expect([...nodeOf(list).children].map((child) => child.className.split(' ')[0])).toEqual([
			'so-list-box-item',
			'so-list-box-item',
		])

		list.items = []
		await flush()

		expect([...list.children].map((child) => child.className)).toEqual([
			'head',
			'so-list-box__list',
			'foot',
		])
		expect([...nodeOf(list).children].map((child) => child.className)).toEqual(['probe'])
	})

	/**
	 * Слоты элементов из данных — образцы: владелец кладёт копию одного образца
	 * в каждый свой элемент из данных — в его слот, назначением, вместе с
	 * текстом.
	 */
	it('образцы item-* — копия в каждом элементе из данных, в его слоте', async () => {
		const list = await mountList(
			{ items: ITEMS.slice(0, 2) },
			`<template slot="item"><b class="own">Свой</b></template>
			<template slot="item-leading"><u class="lead">до</u></template>
			<template slot="item-trailing"><s class="trail">после</s></template>`,
		)

		expect(rows().map((row) => row.querySelector('.so-button__text')?.textContent)).toEqual([
			'Свой',
			'Свой',
		])

		for (const row of rows()) {
			const text = find(row, '.so-button__text', HTMLElement)

			expect(text.previousElementSibling?.classList.contains('lead')).toBe(true)
			expect(text.nextElementSibling?.classList.contains('trail')).toBe(true)
		}

		expect(list.querySelector('template')).toBeNull()
	})

	/** Образец отметки задан — у выбранного элемента он вместо своей иконки. */
	it('item-indicator-icon — отметка выбранных вместо своей иконки', async () => {
		await mountList(
			{ items: ITEMS.slice(0, 2), mode: 'multiple', indicator: 'start' },
			'<template slot="item-indicator-icon"><b class="probe">✓</b></template>',
		)

		expect(marks()).toEqual(['empty', 'empty'])

		await click(rowOf('Первый'))

		expect(marks()).toEqual(['slot', 'empty'])

		await click(rowOf('Второй'))

		expect(marks()).toEqual(['slot', 'slot'])
	})

	/** Пустой образец ничего не кладёт: слот элемента не задан, и отметка — своя. */
	it('пустой образец — у элемента своя иконка', async () => {
		await mountList(
			{ items: ITEMS.slice(0, 2), indicator: 'start', value: 'a' },
			'<template slot="item-indicator-icon"> </template>',
		)

		expect(marks()).toEqual(['icon', 'empty'])
	})
})

/**
 * В окне коллекция рисует видимые элементы и распорки на месте пропущенных:
 * запись распорки несёт стиль — высоту пропущенных и место в составе. Окно
 * ставит обёртка `Virtual`; здесь — движок снаружи со стратегией окна и
 * замером, как их ставит обёртка.
 */
describe('распорки окна', () => {
	const MANY = Array.from({ length: 100 }, (_, index) => ({
		value: `v${index}`,
		text: `Пункт ${index}`,
	}))

	const fillers = (list: Element) =>
		[...list.querySelectorAll('.so-list-box__filler')].filter(
			(node): node is HTMLElement => node instanceof HTMLElement,
		)

	it('распорка — div под aria-hidden со стилем записи; сменилось окно — стиль той же распорки', async () => {
		const engine = createEngineListBox({ items: MANY })
		const { draw } = engine.extensions

		draw.useStrategy(new TWindowStrategy())
		draw.notifyViewport({ top: 0, bottom: 100, step: 10 })

		const list = await mountList({ engine })
		const [tail] = fillers(list)

		expect(fillers(list)).toHaveLength(1)
		expect(tail.getAttribute('aria-hidden')).toBe('true')
		expect(tail.style.getPropertyValue('--so-filler-height')).toBe('800px')
		expect(tail.style.getPropertyValue('order')).toBe('100')
		expect(listItems()).toHaveLength(20)

		draw.notifyViewport({ top: 0, bottom: 200, step: 10 })
		await flush()

		expect(fillers(list)).toEqual([tail])
		expect(tail.style.getPropertyValue('--so-filler-height')).toBe('700px')
		expect(listItems()).toHaveLength(30)
		// Распорки и элементы — в узле списка
		expect(nodeOf(list).lastElementChild).toBe(tail)
	})
})

/**
 * Группы — как у Vue (`ui/vue/__tests__/list-groups.spec.ts`). Из данных:
 * секции нарисованного (`drawnSections`) — группа с подписью в
 * `<div is="so-list-box-group">`, элементы без группы — прямо в списке, а
 * между секциями, пока их просит список (`groupSeparators`, по умолчанию
 * выключен), — немой разделитель; группы из `groups` — первыми, остальное —
 * по месту. Записи группы — её свет, и элементы в ней находят движок списка
 * лифтом сквозь группу. Разметкой: группа входит в ту же группировку — ключ
 * элементы её света находят лифтом вверх по документу, — и секции описывают
 * её. Стрелки ходят тем же порядком, что элементы стоят на экране.
 */
describe('группы', () => {
	/** В данных «Морковь» стоит между фруктами, у «Воды» группы нет. */
	const MIXED = [
		{ value: 'apple', text: 'Яблоко', _: { group: 'fruit' } },
		{ value: 'carrot', text: 'Морковь', _: { group: 'veg' } },
		{ value: 'water', text: 'Вода' },
		{ value: 'pear', text: 'Груша', _: { group: 'fruit' } },
	]

	const GROUPS = [
		{ key: 'fruit', label: 'Фрукты' },
		{ key: 'veg', label: 'Овощи' },
	]

	/** Части узла списка: группа — подписью и текстами элементов, разделитель — `—`. */
	const parts = (list: Element) =>
		[...nodeOf(list).children].map((node) => {
			if (node.classList.contains('so-list-box-group')) {
				return [
					node.querySelector('.so-list-box-group__label')?.textContent?.trim() ?? '',
					[...node.querySelectorAll('.so-list-box-item')].map((item) =>
						item.textContent?.trim(),
					),
				]
			}

			if (node.classList.contains('so-list-box__separator')) return '—'

			return node.textContent?.trim()
		})

	/** Секции `MIXED` на экране — без разделителей и с ними. */
	const SECTIONS = [['Фрукты', ['Яблоко', 'Груша']], ['Овощи', ['Морковь']], 'Вода']
	const SEPARATED = [['Фрукты', ['Яблоко', 'Груша']], '—', ['Овощи', ['Морковь']], '—', 'Вода']

	it('группа с подписью, без группы — последними; разделителей по умолчанию нет', async () => {
		const list = await mountList({ items: MIXED, groups: GROUPS })

		await flush()

		expect(parts(list)).toEqual(SECTIONS)

		for (const group of nodeOf(list).querySelectorAll('.so-list-box-group')) {
			const label = find(group, '.so-list-box-group__label', HTMLElement)

			expect(group).toBeInstanceOf(TListBoxGroupElement)
			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
			expect(label.getAttribute('role')).toBe('presentation')
			// Подпись — первая, элементы — за ней
			expect(group.firstElementChild).toBe(label)
		}

		// Элементы группы — в коллекции списка: выбор пишет им `aria-selected`
		expect(selection()).toEqual(['false', 'false', 'false', 'false'])
	})

	it('groupSeparators — немой разделитель между соседними секциями; снятый — те же группы и элементы', async () => {
		const list = await mountList({ items: MIXED, groups: GROUPS, groupSeparators: true })

		await flush()

		expect(parts(list)).toEqual(SEPARATED)
		expect(
			[...nodeOf(list).querySelectorAll('.so-list-box__separator')].map((node) =>
				node.getAttribute('aria-hidden'),
			),
		).toEqual(['true', 'true'])

		const group = find(nodeOf(list), '.so-list-box-group', HTMLElement)
		const items = listItems()

		list.groupSeparators = false
		await flush()

		expect(parts(list)).toEqual(SECTIONS)
		expect(find(nodeOf(list), '.so-list-box-group', HTMLElement)).toBe(group)
		listItems().forEach((node, index) => expect(node).toBe(items[index]))
	})

	it('атрибут group-separators без значения включает разделители', async () => {
		const host = await mount('<div is="so-list-box" group-separators></div>')
		const list = listIn(host)

		list.items = MIXED
		list.groups = GROUPS
		await flush()
		await flush()

		expect(parts(list)).toEqual(SEPARATED)
	})

	it('стрелки ходят порядком экрана: ↓ после «Яблока» — «Груша»', async () => {
		const list = await mountList({ items: MIXED, groups: GROUPS })

		await flush()
		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()

		await press(nodeOf(list), 'ArrowDown')
		expect(highlighted()).toBe('Яблоко')

		await press(nodeOf(list), 'ArrowDown')
		expect(highlighted()).toBe('Груша')

		await press(nodeOf(list), 'ArrowDown')
		expect(highlighted()).toBe('Морковь')
	})

	it('смена подписи — та же группа и те же элементы с новой подписью', async () => {
		const list = await mountList({ items: MIXED, groups: GROUPS })

		await flush()

		const group = find(nodeOf(list), '.so-list-box-group', HTMLElement)
		const items = listItems()

		list.groups = [
			{ key: 'fruit', label: 'Fruit' },
			{ key: 'veg', label: 'Vegetables' },
		]
		await flush()
		await flush()

		expect(parts(list)).toEqual([
			['Fruit', ['Яблоко', 'Груша']],
			['Vegetables', ['Морковь']],
			'Вода',
		])
		expect(find(nodeOf(list), '.so-list-box-group', HTMLElement)).toBe(group)
		listItems().forEach((node, index) => expect(node).toBe(items[index]))
	})

	it('без группировки — ни групп, ни разделителей', async () => {
		const list = await mountList({ items: ITEMS })

		expect(parts(list)).toEqual(['Первый', 'Второй', 'Третий'])
	})

	it('группа разметкой — группа с подписью, элементы в ней — в коллекции списка', async () => {
		const host = await mount(`<div is="so-list-box">
			<div is="so-list-box-group" label="Фрукты">
				<div is="so-list-box-item" value="apple" text="Яблоко"></div>
			</div>
			<div is="so-list-box-item" value="water" text="Вода"></div>
		</div>`)

		await flush()

		expect(parts(listIn(host))).toEqual([['Фрукты', ['Яблоко']], 'Вода'])
		expect(selection()).toEqual(['false', 'false'])
	})

	/** «Вода» — над группой «Фрукты», «Сок» — под ней: группы не заявлены. */
	const MARKUP = `<div is="so-list-box-item" value="water" text="Вода"></div>
		<div is="so-list-box-group" label="Фрукты">
			<div is="so-list-box-item" value="apple" text="Яблоко"></div>
			<div is="so-list-box-item" value="pear" text="Груша"></div>
		</div>
		<div is="so-list-box-item" value="juice" text="Сок"></div>`

	/** Секции коротко: подпись группы (`null` — без группы) и значения элементов. */
	const brief = (engine: TListBoxCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('группа разметки — в группировке: секции с подписью, элементы вне группы — на местах', async () => {
		const engine = createEngineListBox()
		const list = await mountList({ engine }, MARKUP)

		await flush()

		expect(brief(engine)).toEqual([
			[null, ['water']],
			['Фрукты', ['apple', 'pear']],
			[null, ['juice']],
		])
		expect(parts(list)).toEqual(['Вода', ['Фрукты', ['Яблоко', 'Груша']], 'Сок'])
	})

	it('стрелки по группе разметки — порядком экрана: «Вода» над группой — первой', async () => {
		const list = await mountList({ engine: createEngineListBox() }, MARKUP)

		await flush()
		await nextFrame()

		const highlighted = () =>
			rows()
				.find((row) => row.getAttribute('data-highlighted') === 'true')
				?.textContent?.trim()
		const visited: unknown[] = []

		for (let step = 0; step < 4; step += 1) {
			await press(nodeOf(list), 'ArrowDown')
			visited.push(highlighted())
		}

		expect(visited).toEqual(['Вода', 'Яблоко', 'Груша', 'Сок'])
	})

	it('смена подписи группы разметки — новая подпись секции', async () => {
		const engine = createEngineListBox()
		const list = await mountList({ engine }, MARKUP)

		await flush()

		Reflect.set(find(list, '.so-list-box-group', TListBoxGroupElement), 'label', 'Ягоды')
		await flush()

		expect(brief(engine)[1]).toEqual(['Ягоды', ['apple', 'pear']])
	})

	/**
	 * Разметка написана раньше, чем зарегистрированы элементы: ожившую при
	 * регистрации, её база собирает по месту, и группа опускает ключ раньше,
	 * чем собираются элементы её света. Имена — свои у теста:
	 * зарегистрированные пакетом уже живые.
	 */
	it('разметка до регистрации — элементы в группе входят в её группу', async () => {
		document.body.innerHTML = `<div is="so-test-groups-list">
			<div is="so-test-groups-group" label="Фрукты">
				<div is="so-test-groups-item" value="apple" text="Яблоко"></div>
			</div>
			<div is="so-test-groups-item" value="water" text="Вода"></div>
		</div>`

		// Порядок — как в модуле списка
		defineElement('so-test-groups-list', class extends TListBoxElement {}, 'div')
		defineElement('so-test-groups-group', class extends TListBoxGroupElement {}, 'div')
		defineElement('so-test-groups-item', class extends TListBoxItemElement {}, 'div')

		// Ожившие при регистрации собираются микрозадачей позже
		await flush()
		await flush()

		const list = document.querySelector('[is="so-test-groups-list"]')

		if (!isList(list)) throw new Error('списка нет')

		expect(list.state.drawnSections?.map(({ group }) => group?.label ?? null)).toEqual([
			'Фрукты',
			null,
		])
	})
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	/** Точки слотов шаблона — в пустом корне, где ни один слот не задан. */
	function slotsOf<TInstance, TFacade>(template: ITemplate<TInstance, TFacade>): string[] {
		const root = document.createElement('div')
		const targets = template.create(root, () => false, bareContext<TInstance, TFacade>(root))

		return Object.keys(targets.slots).sort()
	}

	it.each([
		['ListBox', () => slotsOf(listBoxTemplate), ListBoxDescriptor],
		['ListBox.Item', () => slotsOf(listBoxItemTemplate), ListBoxItemDescriptor],
		['ListBox.Group', () => slotsOf(listBoxGroupTemplate), ListBoxGroupDescriptor],
	] as const)('%s', (_name, slots, descriptor) => {
		expect(slots()).toEqual(
			descriptor()
				.slots.map((slot) => slot.name)
				.sort(),
		)
	})
})

describe('типы', () => {
	it('пропсы фасада — свойства элементов', () => {
		expectTypeOf<TListBoxElementProps['value']>().toEqualTypeOf<TListBoxValue | undefined>()
		expectTypeOf<TListBoxElementProps['mode']>().toEqualTypeOf<TSelectionMode | undefined>()
		expectTypeOf<TListBoxElementProps>().toHaveProperty('items')
		expectTypeOf<TListBoxElementProps>().toHaveProperty('engine')
		expectTypeOf<TListBoxItemElementProps['selected']>().toEqualTypeOf<boolean | undefined>()
	})

	it('состояние — вместе со свойствами фасада', () => {
		expectTypeOf<TListBoxElementProps['state']>().toHaveProperty('drawn')
		expectTypeOf<TListBoxItemElementProps['state']>().toHaveProperty('indicator')
	})

	/** У `div` своего `disabled` нет: там это свойство пропа, а у `<button>` — нативное. */
	it('кнопка на div — тип своего тега', () => {
		expectTypeOf<TButtonElementProps<HTMLDivElement>>().toExtend<HTMLDivElement>()
		expectTypeOf<TButtonElementProps<HTMLDivElement>['disabled']>().toEqualTypeOf<
			boolean | undefined
		>()
		expectTypeOf<TButtonElementProps['disabled']>().toEqualTypeOf<boolean>()
	})
})
