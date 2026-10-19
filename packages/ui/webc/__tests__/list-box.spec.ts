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
	type TListBoxValue,
	type TSelectionMode,
	type TValuePayload,
} from '@soldy-ui/core'
import { ListBoxDescriptor, ListBoxItemDescriptor } from '@soldy-ui/setup'
import {
	TListBoxElement,
	TListBoxItemElement,
	registerButtonTag,
	type TButtonElementProps,
	type TListBoxElementProps,
	type TListBoxItemElementProps,
} from '@soldy-ui/webc'
import { listBoxTemplate } from '../src/components/list-box/list-box.template'
import { listBoxItemTemplate } from '../src/components/list-box/item/list-box-item.template'
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
	 * Петля по ключу: запись новая на каждую смену, а элемент — тот же, пока
	 * жив его ключ (`uid`). Переставленный едет переносом силами базы и не
	 * пересобирается, ушедший снимается.
	 */
	it('перестановка и удаление в движке: живые элементы — те же узлы, порядок DOM — порядок данных', async () => {
		const engine = createEngineListBox({ items: ITEMS })
		const list = await mountList({ engine })
		const before = new Map(
			listItems().map((node) => [node.querySelector('.so-button')?.textContent, node]),
		)
		const [a, b, c] = engine.extensions.batch.items
		const bundles: unknown[] = []

		list.addEventListener('so:bundle:create', (event) => bundles.push(event.target))
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

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	it.each([
		['ListBox', listBoxTemplate, ListBoxDescriptor],
		['ListBox.Item', listBoxItemTemplate, ListBoxItemDescriptor],
	] as const)('%s', (_name, template, descriptor) => {
		const root = document.createElement('div')
		const targets = template.create(root, () => false, bareContext(root)).slots

		expect(Object.keys(targets).sort()).toEqual(
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
