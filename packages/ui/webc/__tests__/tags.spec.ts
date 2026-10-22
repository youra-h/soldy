/**
 * Tags под Web Components — набор тегов на движке коллекций.
 *
 * Сценарии — те же, что у Vue (`tags-close.spec.ts`, `tags-keyboard.spec.ts`,
 * `tags-overflow.spec.ts`, `tags-select.spec.ts`, `tags-variant.spec.ts`), без
 * сервера: кнопка закрытия — сосед строки, одна остановка Tab с выбором,
 * клавиатура, выбор по `press`, переполнение, вариант тега. Движок коллекций,
 * его расширения и плагины перенесены без правок.
 *
 * Своё у Web Components — разметка. Корень набора и тега — элемент
 * потребителя (`<div is="so-tags">`, `<div is="so-tags-item">`), а строка тега
 * — Button на `div`, `<div is="so-button-div">`: одно имя элемента расширяет
 * один тег. Атрибуты потребителя у тега делятся между корнем и строкой. Тег
 * входит в коллекцию, когда собирается: движок набора он находит лифтом вверх
 * по документу. Слоты тега — свет строки (свет детали). Scope у слотов нет:
 * своя раскладка тегов — разметка с тегами внутри набора, а слоты тегов из
 * данных — образцы (`<template slot="item-leading">`), копию которых получает
 * каждый тег. Тег разметки, закрытый крестиком, уходит из коллекции, и его
 * корень прячется (`rendered = false`): элемент написал потребитель, и убрать
 * его компонент не может. Отрисовка — микрозадачей после смены ядра, слушатели
 * плагинов — кадром позже.
 */

import { describe, it, expect, expectTypeOf, afterEach, vi } from 'vitest'
import {
	TTags,
	createEngineTags,
	type TSelectionMode,
	type TTagsCollection,
	type TTagsOverflow,
} from '@soldy-ui/core'
import { TagsDescriptor, TagsItemDescriptor } from '@soldy-ui/setup'
import {
	TTagsElement,
	TTagsItemElement,
	defineElement,
	registerButtonTag,
	type ITemplate,
	type TButtonElementProps,
	type TTagsElementProps,
	type TTagsItemElementProps,
} from '@soldy-ui/webc'
import { tagsTemplate } from '../src/components/tags/tags.template'
import { tagsItemTemplate } from '../src/components/tags/item/tags-item.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

/** Строка тега — Button на `div`. */
const TButtonDivElement = registerButtonTag('div')

function isTags(node: Element | null): node is TTagsElementProps {
	return node instanceof TTagsElement
}

function isTag(node: Element | null): node is TTagsItemElementProps {
	return node instanceof TTagsItemElement
}

function isRow(node: Element | null): node is TButtonElementProps<HTMLDivElement> {
	return node instanceof TButtonDivElement
}

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

/** Набор в разметке; нет его — тест падает здесь. */
function tagsIn(root: ParentNode): TTagsElementProps {
	const node = root.querySelector('[is="so-tags"]')

	if (!isTags(node)) throw new Error('<div is="so-tags"> нет')

	return node
}

/** Набор кодом: пропсы свойствами и свет — до вставки. */
async function mountTags(props: Record<string, unknown>, light = ''): Promise<TTagsElementProps> {
	const el = document.createElement('div', { is: 'so-tags' })

	if (!isTags(el)) throw new Error('<div is="so-tags"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	el.innerHTML = light
	document.body.appendChild(el)
	await flush()

	return el
}

/** Показанные теги: корень тега, закрытого крестиком, спрятан. */
const shownTags = (root: ParentNode = document): TTagsItemElementProps[] =>
	[...root.querySelectorAll('.so-tags-item')].filter(
		(node): node is TTagsItemElementProps => isTag(node) && node.style.display !== 'none',
	)

/** Строка тега — первый ребёнок корня: носитель его роли и `aria-selected`. */
function rowIn(tag: Element): TButtonElementProps<HTMLDivElement> {
	const row = tag.firstElementChild

	if (!isRow(row)) throw new Error('у тега нет строки')

	return row
}

/** Строки показанных тегов. */
const rows = (root?: ParentNode) => shownTags(root).map(rowIn)

/** Тег по тексту строки; нет его — тест падает здесь. */
function item(text: string, root?: ParentNode): TTagsItemElementProps {
	const found = shownTags(root).find((tag) => rowIn(tag).textContent?.trim() === text)

	if (!found) throw new Error(`тега «${text}» нет`)

	return found
}

const rowOf = (text: string, root?: ParentNode) => rowIn(item(text, root))

/** Кнопка закрытия тега; нет её — тест падает здесь. */
const closeOf = (text: string, root?: ParentNode) =>
	find(item(text, root), '.so-tags-item__close', HTMLButtonElement)

/** `aria-selected` строк по порядку. */
const selection = () => rows().map((row) => row.getAttribute('aria-selected'))

/** `tabindex` строк по порядку. */
const rowTabindex = (texts: string[], root?: ParentNode) =>
	texts.map((text) => rowOf(text, root).getAttribute('tabindex'))

/**
 * Нажатие клавиши, как его шлёт браузер: keydown и keyup, всплывают и
 * отменяются. Пробел нажимает строку, когда его отпускают, — как `<button>`.
 */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	target.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }))
}

/** Клик и отрисовка того, что он поменял. */
async function click(element: HTMLElement): Promise<void> {
	element.click()
	await flush()
}

const ITEMS = [
	{ value: 'a', text: 'A' },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

/** Закрываемые теги в режиме выбора и без него: разметка обязана быть одной. */
const CLOSABLE: Record<'multiple' | 'none', string> = {
	multiple: `<div is="so-tags" closable mode="multiple">
		<div is="so-tags-item" value="settings" text="Настройки" selected></div>
		<div is="so-tags-item" value="mail" text="Почта"></div>
	</div>`,
	none: `<div is="so-tags" closable>
		<div is="so-tags-item" value="settings" text="Настройки"></div>
		<div is="so-tags-item" value="mail" text="Почта"></div>
	</div>`,
}

const ROLES = { multiple: 'option', none: 'listitem' } as const

/** Три тега разметкой, «B» выбран. */
const ABC = `<div is="so-tags-item" value="a" text="A"></div>
	<div is="so-tags-item" value="b" text="B" selected></div>
	<div is="so-tags-item" value="c" text="C"></div>`

/**
 * Кнопка закрытия — сосед строки, а не её потомок: потомки опции для
 * скринридера презентационны, и подпись крестика приклеилась бы к названию
 * тега. Разметка одна на все режимы.
 */
describe.each(['multiple', 'none'] as const)('разметка, mode="%s"', (mode) => {
	it('у строки тега нет интерактивного потомка', async () => {
		await mount(CLOSABLE[mode])

		expect(rows()).toHaveLength(2)

		for (const row of rows()) {
			expect(row.getAttribute('role')).toBe(ROLES[mode])
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе тега сразу после строки', async () => {
		await mount(CLOSABLE[mode])

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row.getAttribute('role')).toBe(ROLES[mode])
		expect(close.tagName).toBe('BUTTON')
		expect(close.classList.contains('so-tags-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое тега не входит', async () => {
		await mount(CLOSABLE[mode])

		const row = rowOf('Настройки')

		expect(row.textContent?.trim()).toBe('Настройки')
		expect(row.querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})
})

describe('кнопка закрытия: разметка', () => {
	it('без closable кнопки нет, в элементе одна строка', async () => {
		await mount('<div is="so-tags"><div is="so-tags-item" value="a" text="A"></div></div>')

		expect(document.querySelector('.so-tags-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('кнопка — деталь с именем места и type="button", в ней — иконка роли close', async () => {
		await mount(CLOSABLE.none)

		const close = closeOf('Настройки')
		const icon = close.querySelector('.so-icon')

		expect(close.getAttribute('embedded')).toBe('tags.close')
		expect(close.getAttribute('type')).toBe('button')
		expect(icon?.getAttribute('embedded')).toBe('tags.close-icon')
		expect(icon?.getAttribute('icon')).toBe('close')
	})

	it('слот close-icon подменяет иконку крестика', async () => {
		await mount(`<div is="so-tags" closable>
			<div is="so-tags-item" value="a" text="A"><b slot="close-icon" class="custom">×</b></div>
		</div>`)

		expect(closeOf('A').querySelector('.custom')).not.toBeNull()
		expect(closeOf('A').querySelector('.so-icon')).toBeNull()
	})
})

/**
 * Пилюлю рисует элемент тега целиком: строка — только содержимое, иначе фон и
 * состояния не покрыли бы кнопку закрытия. Вид тема читает с класса набора,
 * состояние — с `data-*` элемента.
 */
describe('вид — у пилюли, а не у строки', () => {
	it('строка вида не рисует, вид набора — классом на наборе', async () => {
		await mount(`<div is="so-tags" closable view="ghost">
			<div is="so-tags-item" value="a" text="A"></div>
		</div>`)

		expect(tagsIn(document).classList.contains('so-tags--view-ghost')).toBe(true)

		// Строке и крестику вид даёт тема по контексту, разметка его не передаёт
		for (const part of [rowOf('A'), closeOf('A')]) {
			expect([...part.classList].filter((name) => name.includes('--view-'))).toEqual([])
		}
	})

	it('выбор отмечен на элементе тега, а строка его не несёт', async () => {
		await mount(CLOSABLE.multiple)

		expect(item('Настройки').getAttribute('data-selected')).toBe('true')
		expect(rowOf('Настройки').hasAttribute('data-selected')).toBe(false)
		expect(rowOf('Настройки').getAttribute('aria-selected')).toBe('true')
	})
})

describe('кнопка закрытия: поведение', () => {
	it('клик закрывает тег и не выбирает его', async () => {
		await mountTags({ closable: true, mode: 'multiple', items: ITEMS })

		await click(closeOf('B'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(selection()).toEqual(['false', 'false'])
	})

	it('клик по строке выбирает тег', async () => {
		await mountTags({ closable: true, mode: 'multiple', items: ITEMS })
		// Строка выбирает по `press`, а слушатели `TActionPlugin` цепляются через
		// кадр после подключения (`element:ready`)
		await nextFrame()
		await click(rowOf('B'))

		expect(rowOf('B').getAttribute('aria-selected')).toBe('true')
		expect(rows()).toHaveLength(3)
	})

	/**
	 * Нажатие по крестику — не нажатие по тегу и не по набору: корни обоих
	 * слушают нативный клик (`TActionPlugin`), и всплывший до них клик дал бы им
	 * `action:press`. Тег разметки, закрытый крестиком, прячется.
	 */
	it('клик по крестику не даёт so:action:press ни тегу, ни набору', async () => {
		const host = await mount(`<div is="so-tags" closable>
			<div is="so-tags-item" value="a" text="A"></div>
			<div is="so-tags-item" value="b" text="B"></div>
		</div>`)
		const setPresses = vi.fn()
		const tagPresses = vi.fn()

		tagsIn(host).addEventListener('so:action:press', (event) => {
			if (event.target === event.currentTarget) setPresses()
		})
		item('B').addEventListener('so:action:press', (event) => {
			if (event.target === event.currentTarget) tagPresses()
		})

		await nextFrame()

		const closed = item('B')

		await click(closeOf('B'))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A'])
		expect(closed.style.display).toBe('none')
		expect(tagPresses).not.toHaveBeenCalled()
		expect(setPresses).not.toHaveBeenCalled()
	})

	it('размер кнопки — размер тега: от него считается кегль иконки', async () => {
		await mount(`<div is="so-tags" closable size="lg">
			<div is="so-tags-item" value="a" text="A"></div>
		</div>`)

		expect(closeOf('A').classList.contains('so-button--size-lg')).toBe(true)
		expect(closeOf('A').querySelector('.so-icon--size-lg')).not.toBeNull()
	})

	/**
	 * `closable` тега трёхзначен: `undefined` значит «как у набора». Снятое
	 * свойство возвращает тег к значению набора; атрибут булева пропа снимается
	 * в `false`, по HTML-семантике.
	 */
	it('false у тега прячет кнопку, undefined возвращает её от набора', async () => {
		await mount(
			'<div is="so-tags" closable><div is="so-tags-item" value="a" text="A"></div></div>',
		)

		item('A').closable = false
		await flush()

		expect(item('A').querySelector('.so-tags-item__close')).toBeNull()

		item('A').closable = undefined
		await flush()

		expect(item('A').querySelector('.so-tags-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный тег не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного тега кнопки закрытия нет', () => {
	const DISABLED = `<div is="so-tags" closable>
		<div is="so-tags-item" value="a" text="A"></div>
		<div is="so-tags-item" value="b" text="B" disabled></div>
		<div is="so-tags-item" value="c" text="C"></div>
	</div>`

	/** Теги, у которых есть кнопка закрытия, — по тексту строки. */
	const withClose = () =>
		['A', 'B', 'C'].filter((text) => item(text).querySelector('.so-tags-item__close'))

	it('выключенный со старта', async () => {
		await mount(DISABLED)

		expect(withClose()).toEqual(['A', 'C'])
		expect(item('B').children).toHaveLength(1)
	})

	it('выключили позже — кнопка пропала, включили — вернулась', async () => {
		await mount(DISABLED)

		item('C').disabled = true
		await flush()

		expect(withClose()).toEqual(['A'])

		item('C').disabled = false
		await flush()

		expect(withClose()).toEqual(['A', 'C'])
	})

	it('выключили набор — кнопок нет ни у одного тега, включили — вернулись', async () => {
		const host = await mount(DISABLED)

		tagsIn(host).disabled = true
		await flush()

		expect(withClose()).toEqual([])

		tagsIn(host).disabled = false
		await flush()

		// `disabled` набора распространяется на всех: включение включает и «B»
		expect(withClose()).toEqual(['A', 'B', 'C'])
	})
})

describe('с выбором — одна остановка Tab на весь набор', () => {
	it('tabindex="0" ровно у одной строки — у выбранной', async () => {
		await mount(`<div is="so-tags" closable mode="multiple">${ABC}</div>`)

		const stops = document.querySelectorAll('[role="option"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(rowOf('B'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '0', '-1'])
	})

	it('без выбранного — у первой строки', async () => {
		await mount(`<div is="so-tags" mode="single">
			<div is="so-tags-item" value="a" text="A"></div>
			<div is="so-tags-item" value="b" text="B"></div>
		</div>`)

		expect(rowTabindex(['A', 'B'])).toEqual(['0', '-1'])
	})

	it('кнопка закрытия — не остановка Tab: тег закрывает Delete', async () => {
		await mount(`<div is="so-tags" closable mode="multiple">${ABC}</div>`)

		expect(['A', 'B', 'C'].map((text) => closeOf(text).getAttribute('tabindex'))).toEqual([
			'-1',
			'-1',
			'-1',
		])
	})

	it('набор объявляет горизонтальный listbox с множественным выбором', async () => {
		const host = await mount(`<div is="so-tags" mode="multiple">${ABC}</div>`)
		const set = tagsIn(host)

		expect(set.getAttribute('role')).toBe('listbox')
		expect(set.getAttribute('aria-orientation')).toBe('horizontal')
		expect(set.getAttribute('aria-multiselectable')).toBe('true')
	})
})

/**
 * Без выбора у строки нет действия: остановка ей не нужна, а крестик —
 * единственный путь закрыть тег с клавиатуры.
 */
describe('без выбора строки Tab не ловят, крестик ловит', () => {
	it('у строк -1, у крестика tabindex нет — он нативная остановка', async () => {
		const host = await mount(`<div is="so-tags" closable>${ABC}</div>`)

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '-1'])
		expect(['A', 'B', 'C'].map((text) => closeOf(text).hasAttribute('tabindex'))).toEqual([
			false,
			false,
			false,
		])
		expect(tagsIn(host).hasAttribute('aria-orientation')).toBe(false)
		expect(tagsIn(host).getAttribute('role')).toBe('list')
	})

	it('включили выбор — остановка появилась, выключили — ушла', async () => {
		const host = await mount(`<div is="so-tags" closable>${ABC}</div>`)
		const set = tagsIn(host)

		set.mode = 'single'
		await flush()

		// `selected` у «B» пришёл, пока выбора не было, и не записался — выбранного нет
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
		expect(closeOf('A').getAttribute('tabindex')).toBe('-1')

		set.mode = 'none'
		await flush()

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '-1'])
		expect(closeOf('A').hasAttribute('tabindex')).toBe(false)
	})
})

describe('клавиатура', () => {
	it('→ переносит фокус на строку следующего тега и остановку вместе с ним', async () => {
		await mount(`<div is="so-tags" mode="multiple">${ABC}</div>`)
		await nextFrame()

		rowOf('B').focus()
		press(rowOf('B'), 'ArrowRight')
		await flush()

		expect(document.activeElement).toBe(rowOf('C'))
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
		expect(rowOf('C').getAttribute('aria-selected')).toBe('false')
	})

	it('пробел выбирает тег под фокусом, остановка остаётся на нём', async () => {
		await mount(`<div is="so-tags" mode="multiple">${ABC}</div>`)
		await nextFrame()

		rowOf('B').focus()
		press(rowOf('B'), 'ArrowRight')
		press(rowOf('C'), ' ')
		await flush()

		expect(rowOf('C').getAttribute('aria-selected')).toBe('true')
		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['-1', '-1', '0'])
	})

	it('фокус на строке — кликом или из кода — переносит остановку на неё', async () => {
		await mount(`<div is="so-tags" mode="multiple">${ABC}</div>`)
		await nextFrame()

		rowOf('A').focus()
		await flush()

		expect(rowTabindex(['A', 'B', 'C'])).toEqual(['0', '-1', '-1'])
	})

	it('Delete закрывает тег, фокус остаётся в наборе — на соседе', async () => {
		await mountTags({ closable: true, mode: 'multiple', items: ITEMS })
		await nextFrame()

		rowOf('B').focus()
		press(rowOf('B'), 'Delete')
		await flush()

		expect(shownTags()).toHaveLength(2)
		expect(document.activeElement).toBe(rowOf('C'))
		expect(rowTabindex(['A', 'C'])).toEqual(['-1', '0'])
	})
})

/**
 * Строка выбирает тег по `press`, а не по клику: фокус держит она сама, и клик
 * из Enter и пробела на `div` делает её `TActionPlugin`. `press` не приходит
 * на выключенный тег.
 */
describe('Enter и пробел на строке переключают выбор', () => {
	it.each([
		['Enter', 'Enter'],
		['пробел', ' '],
	] as const)('%s выбирает тег, повтор снимает выбор', async (_name, key) => {
		await mountTags({ mode: 'multiple', items: ITEMS })
		await nextFrame()

		press(rowOf('B'), key)
		await flush()

		expect(selection()).toEqual(['false', 'true', 'false'])

		press(rowOf('B'), key)
		await flush()

		expect(selection()).toEqual(['false', 'false', 'false'])
	})
})

describe('выключенный тег не выбирается', () => {
	const HARNESS = `<div is="so-tags" mode="multiple">
		<div is="so-tags-item" value="a" text="A"></div>
		<div is="so-tags-item" value="b" text="B"></div>
	</div>`

	const GESTURES = [
		['клик', (row: HTMLElement) => row.click()],
		['Enter', (row: HTMLElement) => press(row, 'Enter')],
		['пробел', (row: HTMLElement) => press(row, ' ')],
	] as const

	const WAYS = [
		['выключен сам', (_host: HTMLElement) => item('B')],
		['выключен набор', (host: HTMLElement) => tagsIn(host)],
	] as const

	describe.each(WAYS)('%s', (_way, target) => {
		it.each(GESTURES)('%s не выбирает, после включения — выбирает', async (_name, gesture) => {
			const host = await mount(HARNESS)
			const off = target(host)

			off.disabled = true
			await flush()
			await nextFrame()

			gesture(rowOf('B'))
			await flush()

			expect(selection()).toEqual(['false', 'false'])

			off.disabled = false
			await flush()

			gesture(rowOf('B'))
			await flush()

			expect(selection()).toEqual(['false', 'true'])
		})
	})
})

/**
 * У набора два режима, `wrap` и `scroll`, и оба — раскладка темы: разметка
 * отдаёт режим через `data-overflow` и рисует все показанные теги.
 */
describe('переполнение', () => {
	const TEXTS = ['Москва', 'Тверь', 'Тула']

	const mountOverflow = async (overflow: TTagsOverflow) => {
		const ctrl = new TTags({ overflow, closable: true })
		const engine = createEngineTags({
			owner: ctrl,
			items: TEXTS.map((text) => ({ value: text, text })),
		})

		return mountTags({ ctrl, engine })
	}

	it.each(['wrap', 'scroll'] as const)('%s: все теги в ряду', async (overflow) => {
		const set = await mountOverflow(overflow)

		expect(rows(set).map((row) => row.textContent?.trim())).toEqual(TEXTS)
	})

	it('режим уезжает в тему через data-overflow', async () => {
		const set = await mountOverflow('scroll')

		expect(set.dataset['overflow']).toBe('scroll')
	})
})

/**
 * Своя раскладка тегов — разметка в слоте по умолчанию: обёртка и в ней теги.
 * Scope у слотов Web Components нет, и показанные теги своей разметке не
 * отдать — теги в ней пишет потребитель. Тег в своей разметке — тот же элемент
 * коллекции: движок набора он находит лифтом сквозь обёртку, закрывается и
 * выбывает так же.
 */
describe('слот default: своя раскладка тегов', () => {
	const OWN = `<div is="so-tags" closable>
		<div class="own">
			<div is="so-tags-item" value="msk" text="Москва"></div>
			<div is="so-tags-item" value="tver" text="Тверь"></div>
			<div is="so-tags-item" value="tula" text="Тула"></div>
		</div>
	</div>`

	it('теги стоят в своей разметке и входят в коллекцию набора', async () => {
		const host = await mount(OWN)
		const own = find(host, '.own', HTMLDivElement)

		expect(rows(own).map((row) => row.textContent?.trim())).toEqual(['Москва', 'Тверь', 'Тула'])
		expect(tagsIn(host).state.items?.map((tag) => tag.value)).toEqual(['msk', 'tver', 'tula'])
	})

	it('закрытый тег выбывает и из своей разметки', async () => {
		const host = await mount(OWN)
		const own = find(host, '.own', HTMLDivElement)

		await click(closeOf('Тверь', own))

		expect(rows(own).map((row) => row.textContent?.trim())).toEqual(['Москва', 'Тула'])
		expect(tagsIn(host).state.items?.map((tag) => tag.value)).toEqual(['msk', 'tula'])
	})
})

/**
 * Вариант тега — свой, а не набора: набор его тегу не пишет, а вариант набора
 * остаётся модификатором корня набора.
 */
describe('вариант', () => {
	/** Модификаторы варианта узла: по ним видно и что встало, и что снялось. */
	const variantsOf = (element: Element, block: string): string[] =>
		[...element.classList].filter((name) => name.startsWith(`${block}--variant-`))

	const tagVariants = (text: string) => variantsOf(item(text), 'so-tags-item')

	it('тег разметки несёт свой модификатор; смена — новый, снятие — без него', async () => {
		await mount(`<div is="so-tags">
			<div is="so-tags-item" value="a" text="A" variant="danger"></div>
			<div is="so-tags-item" value="b" text="B"></div>
		</div>`)

		expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])

		item('A').variant = 'brand'
		await flush()

		expect(tagVariants('A')).toEqual(['so-tags-item--variant-brand'])

		item('A').variant = undefined
		await flush()

		expect(tagVariants('A')).toEqual([])
	})

	it('смена варианта у набора своего модификатора не трогает и тегу без своего его не даёт', async () => {
		const set = await mountTags({
			variant: 'danger',
			items: [
				{ value: 'a', text: 'A', variant: 'danger' },
				{ value: 'b', text: 'B' },
			],
		})

		expect(variantsOf(set, 'so-tags')).toEqual(['so-tags--variant-danger'])
		expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])

		set.variant = 'brand'
		await flush()

		expect(variantsOf(set, 'so-tags')).toEqual(['so-tags--variant-brand'])
		expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
		expect(tagVariants('B')).toEqual([])

		set.variant = undefined
		await flush()

		expect(variantsOf(set, 'so-tags')).toEqual([])
		expect(tagVariants('A')).toEqual(['so-tags-item--variant-danger'])
	})
})

describe('строка — кнопка на div', () => {
	it('строка — <div is="so-button-div"> с именем места, своего type у неё нет', async () => {
		await mount(CLOSABLE.none)

		const row = rowOf('Почта')

		expect(row).toBeInstanceOf(HTMLDivElement)
		expect(row.getAttribute('embedded')).toBe('tags.row')
		expect(row.hasAttribute('type')).toBe(false)
		expect(row.parentElement).toBe(item('Почта'))
		expect(document.querySelectorAll('.so-tags-item [role="button"]')).toHaveLength(0)
	})

	it('класс и стиль потребителя — корню тега, id, title, aria-label и data-* — строке', async () => {
		await mount(`<div is="so-tags">
			<div
				is="so-tags-item"
				value="a"
				text="A"
				class="mine"
				style="color: red"
				id="tag-a"
				title="Тег"
				aria-label="Тег А"
				data-testid="tag"
			></div>
		</div>`)

		const tag = item('A')
		const row = rowOf('A')

		expect(tag.classList.contains('mine')).toBe(true)
		expect(tag.style.color).toBe('red')
		expect(
			['id', 'title', 'aria-label', 'data-testid'].filter((name) => tag.hasAttribute(name)),
		).toEqual([])
		expect(row.id).toBe('tag-a')
		expect(row.getAttribute('title')).toBe('Тег')
		expect(row.getAttribute('aria-label')).toBe('Тег А')
		expect(row.dataset['testid']).toBe('tag')
		expect(row.classList.contains('mine')).toBe(false)
	})

	it('слоты тега — свет строки: leading и trailing по краям, default вместо text', async () => {
		await mount(`<div is="so-tags">
			<div is="so-tags-item" value="a" text="A">
				<i slot="trailing" class="tail">!</i>
				<b>Свой</b>
				<i slot="leading" class="head">*</i>
			</div>
		</div>`)

		const row = rowIn(shownTags()[0])

		expect([...row.children].map((node) => node.className)).toEqual([
			'head',
			'so-button__text',
			'tail',
		])
		expect(find(row, '.so-button__text b', HTMLElement).textContent).toBe('Свой')
	})
})

describe('теги из данных', () => {
	it('набор из items рисует тег на каждый, корень тега — по месту в коллекции', async () => {
		await mountTags({ items: ITEMS })

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A', 'B', 'C'])
		expect(shownTags().map((tag) => tag.style.order)).toEqual(['0', '1', '2'])
	})

	it('engine снаружи: теги движка рисуются, добавленное в него — тоже', async () => {
		const engine: TTagsCollection = createEngineTags({ items: ITEMS.slice(0, 2) })

		await mountTags({ engine })

		expect(shownTags()).toHaveLength(2)

		engine.extensions.batch.set([{ value: 'c', text: 'C' }])
		await flush()

		expect(shownTags()).toHaveLength(3)
	})

	it('сузили shown — на экране меньше тегов, в коллекции все', async () => {
		const engine = createEngineTags({ items: ITEMS })

		await mountTags({ engine })

		engine.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.filter((tag) => tag.value !== 'b')
		})
		engine.getCore().driver.invalidateQuery()
		await flush()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(engine.extensions.batch.items).toHaveLength(3)
	})

	/** Тег из данных — элемент своей коллекции, а не деталь: признака места у него нет. */
	it('тег из данных без embedded', async () => {
		await mountTags({ items: ITEMS })

		expect(shownTags().some((tag) => tag.hasAttribute('embedded'))).toBe(false)
	})

	/**
	 * Петля по ключу: тег, переставленный в движке, — тот же узел, ушедший
	 * снимается. Переставленный едет переносом силами базы и не пересобирается.
	 */
	it('перестановка и удаление в движке: живые теги — те же узлы, порядок DOM — порядок данных', async () => {
		const engine = createEngineTags({ items: ITEMS })
		const set = await mountTags({ engine })
		const before = new Map(shownTags().map((tag) => [rowIn(tag).textContent?.trim(), tag]))
		const [a, b, c] = engine.extensions.batch.items
		const bundles: unknown[] = []

		set.addEventListener('so:bundle:create', (event) => bundles.push(event.target), {
			capture: true,
		})
		engine.extensions.plain.move(c, 0)
		engine.extensions.plain.remove(b)
		await flush()

		expect(engine.extensions.batch.shown).toEqual([c, a])
		expect(shownTags()).toEqual([before.get('C'), before.get('A')])
		expect(before.get('B')?.isConnected).toBe(false)
		expect(bundles).toEqual([])
	})

	/**
	 * Событие тега всплывает, только если тег написал потребитель. Тег из данных
	 * построил шаблон набора (`createItem`) — его события слышно на нём самом.
	 */
	it('событие тега из данных не всплывает, тега разметки — всплывает', async () => {
		const names = ['so:bundle:create', 'so:element:ready']
		const host = document.createElement('div')
		const data = document.createElement('div', { is: 'so-tags' })
		const bubbled: string[] = []
		const onDrawn = new Set<string>()

		if (!isTags(data)) throw new Error('<div is="so-tags"> нет')

		host.innerHTML =
			'<div is="so-tags"><div is="so-tags-item" value="a" text="Разметка"></div></div>'
		data.items = [{ value: 'b', text: 'Данные' }]
		host.append(data)

		for (const name of names) {
			host.addEventListener(name, ({ target }) => {
				if (target instanceof Element && isTag(target))
					bubbled.push(`${target.ctrl?.text}: ${name}`)
			})
		}

		document.body.appendChild(host)

		const drawn = data.querySelector('.so-tags-item')

		if (!drawn) throw new Error('тега из данных нет')

		for (const name of names) drawn.addEventListener(name, () => onDrawn.add(name))

		await nextFrame()

		expect([...onDrawn].sort()).toEqual([...names].sort())
		expect(bubbled.sort()).toEqual(names.map((name) => `Разметка: ${name}`).sort())
	})

	/**
	 * Слоты тегов из данных — образцы: набор кладёт копию одного образца в
	 * каждый свой тег из данных — в его слот, назначением, вместе с текстом.
	 */
	it('образцы item-* — копия в каждом теге из данных, в его слоте', async () => {
		const set = await mountTags(
			{ items: ITEMS.slice(0, 2), closable: true },
			`<template slot="item"><b class="own">Свой</b></template>
			<template slot="item-leading"><u class="lead">до</u></template>
			<template slot="item-trailing"><s class="trail">после</s></template>
			<template slot="item-close-icon"><i class="cross">×</i></template>`,
		)

		for (const row of rows()) {
			const text = find(row, '.so-button__text', HTMLElement)

			expect(text.textContent).toBe('Свой')
			expect(text.previousElementSibling?.classList.contains('lead')).toBe(true)
			expect(text.nextElementSibling?.classList.contains('trail')).toBe(true)
		}

		for (const tag of shownTags()) {
			const close = find(tag, '.so-tags-item__close', HTMLButtonElement)

			expect(close.querySelector('.cross')).not.toBeNull()
			expect(close.querySelector('.so-icon')).toBeNull()
		}

		expect(set.querySelector('template')).toBeNull()
	})

	/** Пустой образец ничего не кладёт: слот тега не задан, и иконка крестика — своя. */
	it('пустой образец крестика — у тега своя иконка', async () => {
		await mountTags(
			{ items: ITEMS.slice(0, 1), closable: true },
			'<template slot="item-close-icon"> </template>',
		)

		expect(closeOf('A').querySelector('.so-icon')).not.toBeNull()
	})
})

/**
 * Разметка написана раньше, чем зарегистрированы элементы: ожившую при
 * регистрации, её база собирает по месту, и набор опускает движок раньше,
 * чем собираются теги в нём. Имена — свои у теста: зарегистрированные пакетом
 * уже живые.
 */
describe('разметка до регистрации', () => {
	it.each([
		['в порядке модуля набора', 'so-test-tags-up', false],
		['в обратном порядке', 'so-test-tags-down', true],
	] as const)(
		'%s — теги входят в коллекцию набора в порядке документа',
		async (_order, prefix, reversed) => {
			document.body.innerHTML = `<div is="${prefix}-set" mode="single">
			<div is="${prefix}-item" value="a" text="A"></div>
			<div is="${prefix}-item" value="b" text="B" selected></div>
		</div>`

			const kinds: (readonly [string, CustomElementConstructor])[] = [
				['set', class extends TTagsElement {}],
				['item', class extends TTagsItemElement {}],
			]

			for (const [kind, ctor] of reversed ? [...kinds].reverse() : kinds) {
				defineElement(`${prefix}-${kind}`, ctor, 'div')
			}

			// Ожившие при регистрации собираются микрозадачей позже
			await flush()
			await flush()

			const set = document.querySelector(`[is="${prefix}-set"]`)

			if (!isTags(set)) throw new Error('набора нет')

			expect(set.state.items?.map((tag) => tag.value)).toEqual(['a', 'b'])
			expect(selection()).toEqual(['false', 'true'])
		},
	)
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	/** Точки слотов шаблона — в пустом корне, где ни один слот не задан. */
	function slotsOf<TInstance, TFacade>(template: ITemplate<TInstance, TFacade>): string[] {
		const root = document.createElement('div')
		const targets = template.create(root, () => false, bareContext<TInstance, TFacade>(root))

		return Object.keys(targets.slots).sort()
	}

	it.each([
		['Tags', () => slotsOf(tagsTemplate), TagsDescriptor],
		['Tags.Item', () => slotsOf(tagsItemTemplate), TagsItemDescriptor],
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
		expectTypeOf<TTagsElementProps['mode']>().toEqualTypeOf<TSelectionMode | undefined>()
		expectTypeOf<TTagsElementProps>().toHaveProperty('items')
		expectTypeOf<TTagsElementProps>().toHaveProperty('engine')
		expectTypeOf<TTagsItemElementProps['selected']>().toEqualTypeOf<boolean | undefined>()
	})

	it('состояние — вместе со свойствами фасада', () => {
		expectTypeOf<TTagsElementProps['state']>().toHaveProperty('shown')
		expectTypeOf<TTagsItemElementProps['state']>().toHaveProperty('tag_closable')
	})
})
