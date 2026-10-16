/**
 * Элемент коллекции под Web Components: лифт и момент входа.
 *
 * Лифт Web Components — контекст места: сборка владельца отдаёт движок и
 * регистратор своему хосту (`down()`), а элемент берёт ближайшее значение
 * выше себя по документу (`up()`). Значение владельца видят и элементы
 * разметки — его свет, — и элементы из данных в его шаблоне, а соседям и
 * предкам его не видно.
 *
 * В коллекцию элемент входит, когда собирается, — при подключении (`attach`
 * в связке). Подключение, пришедшее, пока подключается другой элемент soldy,
 * ждёт его конца и идёт сразу после него, в порядке прихода (ожидание):
 * раскладка света владельца переносит элементы разметки, и их колбэки
 * приходят внутри его подключения — раньше, чем он опустил движок. Поэтому
 * элементы разметки входят в коллекцию после владельца и в порядке документа
 * — и после `innerHTML`, и в разметке, написанной до регистрации элементов.
 * Связка у элемента новая на каждое подключение: владелец, переставленный в
 * документе, — новый движок, а элемент, переставленный к другому владельцу,
 * входит в его коллекцию.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TTabsItem } from '@soldy-ui/core'
import type { IElevatorKey } from '@soldy-ui/setup'
import {
	TAccordionElement,
	TAccordionItemElement,
	TRadioGroupElement,
	TTabsElement,
	TTabsItemElement,
	defineElement,
	type TAccordionElementProps,
	type TRadioGroupElementProps,
	type TTabsElementProps,
	type TTabsItemElementProps,
} from '@soldy-ui/webc'
import { createWebcElevator } from '../src/adapter/elevator'
import { TPlaceContext } from '../src/adapter/context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

/** Владелец коллекции, как его видит тест: состав по значениям. */
type TOwner = TTabsElementProps | TAccordionElementProps | TRadioGroupElementProps

function isOwner(node: Element | null): node is TOwner {
	return (
		node instanceof TTabsElement ||
		node instanceof TAccordionElement ||
		node instanceof TRadioGroupElement
	)
}

/** Владелец по селектору; нет его — тест падает здесь. */
function owner(selector: string, root: ParentNode = document): TOwner {
	const node = root.querySelector(selector)

	if (!isOwner(node)) throw new Error(`${selector}: владельца коллекции нет`)

	return node
}

/** Узел нужного вида по селектору; нет его — тест падает здесь. */
function pick<T extends Element>(
	selector: string,
	guard: (node: Element | null) => node is T,
	root: ParentNode = document,
): T {
	const node = root.querySelector(selector)

	if (!guard(node)) throw new Error(`${selector}: нужного элемента нет`)

	return node
}

function isTabs(node: Element | null): node is TTabsElementProps {
	return node instanceof TTabsElement
}

function isAccordion(node: Element | null): node is TAccordionElementProps {
	return node instanceof TAccordionElement
}

function isGroup(node: Element | null): node is TRadioGroupElementProps {
	return node instanceof TRadioGroupElement
}

function isTab(node: Element | null): node is TTabsItemElementProps {
	return node instanceof TTabsItemElement
}

/** Значения элементов коллекции владельца по порядку. */
const valuesOf = (el: TOwner) => (el.state.items ?? []).map((item) => item.value)

/** Разметка, подключённая к документу, и её отрисовка. */
async function mount(html: string): Promise<HTMLElement> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	await flush()

	return host
}

/** Ключ лифта для проб места. */
const PROBE: IElevatorKey<string | null> = { name: 'test:probe' }

describe('место лифта', () => {
	/** Разметка проб: внешний и вложенный владельцы, читатели в них и рядом. */
	function places() {
		const outer = document.createElement('section')
		const inner = document.createElement('article')
		const reader = document.createElement('i')
		const deep = document.createElement('b')
		const aside = document.createElement('u')

		outer.append(reader, inner)
		inner.append(deep)
		document.body.append(outer, aside)

		return { outer, inner, reader, deep, aside }
	}

	it('up читает ближайшее значение выше, своё опущенное хост не видит', () => {
		const { outer, inner, reader, deep, aside } = places()

		createWebcElevator(outer)(PROBE).down('outer')
		createWebcElevator(inner)(PROBE).down('inner')

		expect(createWebcElevator(reader)(PROBE).up()).toBe('outer')
		expect(createWebcElevator(deep)(PROBE).up()).toBe('inner')
		expect(createWebcElevator(inner)(PROBE).up()).toBe('outer')
		expect(createWebcElevator(outer)(PROBE).up()).toBeUndefined()
		// Сосед владельца его значения не видит
		expect(createWebcElevator(aside)(PROBE).up()).toBeUndefined()
	})

	/** Слой предка за опущенным `null` уже не читается: им окно отрезают от вложенных списков. */
	it('опущенный null — тоже значение: место выше за ним не читается', () => {
		const { outer, inner, deep } = places()

		createWebcElevator(outer)(PROBE).down('outer')
		createWebcElevator(inner)(PROBE).down(null)

		expect(createWebcElevator(deep)(PROBE).up()).toBeNull()
	})

	/** Повторная сборка опускает значение заново: новое заменяет прежнее. */
	it('down на тот же хост — новое значение вместо прежнего', () => {
		const { outer, reader } = places()

		createWebcElevator(outer)(PROBE).down('first')
		createWebcElevator(outer)(PROBE).down('second')

		expect(createWebcElevator(reader)(PROBE).up()).toBe('second')
	})

	/** Место увезённого корня — у его якоря: поиск идёт к родителю якоря, а не к цели. */
	it('из увезённого корня поиск идёт к месту его якоря', () => {
		const { outer } = places()
		const root = document.createElement('div')
		const anchor = document.createComment('so-teleport')
		const reader = root.appendChild(document.createElement('i'))

		outer.appendChild(anchor)
		document.body.appendChild(root)
		TPlaceContext.anchor(root, anchor)
		createWebcElevator(outer)(PROBE).down('outer')

		try {
			expect(createWebcElevator(reader)(PROBE).up()).toBe('outer')
		} finally {
			TPlaceContext.unanchor(root)
		}
	})
})

describe('лифт', () => {
	/** Элемент вне коллекции никуда не входит: движка выше него нет. */
	it('элемент вне набора никуда не входит и рисуется без коллекции', async () => {
		const host = await mount(`<div is="so-tabs-item" value="z" text="Z"></div>
			<div is="so-tabs"><div is="so-tabs-item" value="a" text="A"></div></div>`)
		const outside = host.querySelector('[value="z"] [role="tab"]')

		expect(valuesOf(owner('[is="so-tabs"]'))).toEqual(['a'])
		// `aria-selected` пишет коллекция: у элемента вне неё атрибута нет
		expect(outside?.hasAttribute('aria-selected')).toBe(false)

		if (outside instanceof HTMLElement) outside.click()
		await flush()

		expect(valuesOf(owner('[is="so-tabs"]'))).toEqual(['a'])
	})

	/** Соседние владельцы не видят движков друг друга: место у каждого своё. */
	it('два набора рядом: у каждого свои элементы', async () => {
		await mount(`<div is="so-accordion" id="left">
				<div is="so-accordion-item" value="a" text="A"></div>
				<div is="so-accordion-item" value="b" text="B"></div>
			</div>
			<div is="so-accordion" id="right">
				<div is="so-accordion-item" value="x" text="X"></div>
				<div is="so-accordion-item" value="y" text="Y"></div>
				<div is="so-accordion-item" value="z" text="Z"></div>
			</div>`)

		expect(valuesOf(owner('#left'))).toEqual(['a', 'b'])
		expect(valuesOf(owner('#right'))).toEqual(['x', 'y', 'z'])
	})

	/**
	 * Коллекция внутри элемента опускает своё значение ближе к своим
	 * элементам: они видят её движок, а элемент внешней — внешний.
	 */
	it('аккордеон в панели секции: элементы входят каждый в свой', async () => {
		await mount(`<div is="so-accordion" id="outer">
			<div is="so-accordion-item" value="a" text="A" selected>
				<div is="so-accordion" id="inner">
					<div is="so-accordion-item" value="x" text="X"></div>
					<div is="so-accordion-item" value="y" text="Y"></div>
				</div>
			</div>
			<div is="so-accordion-item" value="b" text="B"></div>
		</div>`)

		expect(valuesOf(owner('#outer'))).toEqual(['a', 'b'])
		expect(valuesOf(owner('#inner'))).toEqual(['x', 'y'])
	})

	it('группа радио в панели секции: радио входят в её коллекцию', async () => {
		await mount(`<div is="so-accordion" id="sections">
			<div is="so-accordion-item" value="s" text="Секция" selected>
				<div is="so-radio-group" id="group">
					<label is="so-radio-group-item" value="x">X</label>
					<label is="so-radio-group-item" value="y">Y</label>
				</div>
			</div>
		</div>`)

		expect(valuesOf(owner('#sections'))).toEqual(['s'])
		expect(valuesOf(owner('#group'))).toEqual(['x', 'y'])

		const radio = document.querySelector('[value="y"] input')

		if (radio instanceof HTMLInputElement) radio.click()
		await flush()

		expect(pick('#group', isGroup).value).toBe('y')
	})

	/**
	 * Элемент, добавленный после построения, входит в коллекцию, когда
	 * собирается; снятый — выходит. Свет владелец разложил при построении, и
	 * наблюдателя за ним нет: элемент встаёт туда, куда его поставили.
	 */
	it('элементы разметки добавляются и снимаются после монтирования', async () => {
		await mount(`<div is="so-accordion">
			<div is="so-accordion-item" value="a" text="A"></div>
			<div is="so-accordion-item" value="b" text="B"></div>
		</div>`)

		const el = owner('[is="so-accordion"]')

		el.insertAdjacentHTML('beforeend', '<div is="so-accordion-item" value="c" text="C"></div>')
		await flush()

		expect(valuesOf(el)).toEqual(['a', 'b', 'c'])

		el.querySelector('[value="b"]')?.remove()
		await flush()

		expect(valuesOf(el)).toEqual(['a', 'c'])
		expect(document.querySelectorAll('.so-accordion-item')).toHaveLength(2)
	})
})

/**
 * Ожидание: элементы разметки входят в коллекцию после владельца и в порядке
 * документа, как бы разметка ни появилась.
 */
describe('порядок входа', () => {
	it('innerHTML подключённого узла — все элементы в коллекции, в порядке документа', async () => {
		const host = document.body.appendChild(document.createElement('div'))

		host.innerHTML = `<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="A"></div>
			<div is="so-tabs-item" value="b" text="B" active></div>
			<div is="so-tabs-item" value="c" text="C"></div>
		</div>`

		const el = pick('[is="so-tabs"]', isTabs, host)

		expect(valuesOf(el)).toEqual(['a', 'b', 'c'])
		expect(el.state.activeItem?.value).toBe('b')
	})

	it('разметка, вставленная целиком, — то же', async () => {
		await mount(`<div is="so-radio-group" value="c">
			<label is="so-radio-group-item" value="a"></label>
			<label is="so-radio-group-item" value="b"></label>
			<label is="so-radio-group-item" value="c"></label>
		</div>`)

		expect(valuesOf(owner('[is="so-radio-group"]'))).toEqual(['a', 'b', 'c'])
	})

	/**
	 * Разметка написана раньше, чем зарегистрированы элементы: модуль
	 * владельца регистрирует его раньше частей, и при апгрейде владелец
	 * собирается первым — его элементы, ожившие следом, находят движок.
	 * Имена — свои у теста: зарегистрированные пакетом уже живые.
	 */
	it('разметка до регистрации — все элементы в коллекции, в порядке документа', async () => {
		document.body.innerHTML = `<div is="so-test-accordion">
			<div is="so-test-accordion-item" value="a" text="A"></div>
			<div is="so-test-accordion-item" value="b" text="B" selected></div>
			<div is="so-test-accordion-item" value="c" text="C"></div>
		</div>`

		defineElement('so-test-accordion', class extends TAccordionElement {}, 'div')
		defineElement('so-test-accordion-item', class extends TAccordionItemElement {}, 'div')

		// Ожившие при регистрации собираются микрозадачей позже
		await flush()
		await flush()

		const el = owner('[is="so-test-accordion"]')

		expect(valuesOf(el)).toEqual(['a', 'b', 'c'])
		expect(
			[...document.querySelectorAll('.so-accordion-item__header')].map((header) =>
				header.getAttribute('aria-expanded'),
			),
		).toEqual(['false', 'true', 'false'])
	})

	/** Элемент, переставленный к другому владельцу, уходит из первой коллекции и входит во вторую. */
	it('элемент, переставленный к другому владельцу, входит во вторую коллекцию', async () => {
		await mount(`<div is="so-accordion" id="first">
				<div is="so-accordion-item" value="a" text="A"></div>
				<div is="so-accordion-item" value="b" text="B"></div>
			</div>
			<div is="so-accordion" id="second">
				<div is="so-accordion-item" value="x" text="X"></div>
			</div>`)

		const moved = document.querySelector('#first [value="b"]')

		if (!moved) throw new Error('секции «b» нет')

		owner('#second').appendChild(moved)
		await flush()

		expect(valuesOf(owner('#first'))).toEqual(['a'])
		expect(valuesOf(owner('#second'))).toEqual(['x', 'b'])

		// Клик по переставленной — уже коллекция второго
		const header = moved.querySelector('.so-accordion-item__header')

		if (header instanceof HTMLElement) header.click()
		await flush()

		expect(pick('#second', isAccordion).state.selected?.map((item) => item.value)).toEqual([
			'b',
		])
	})

	/** Таб, переставленный кодом приложения, приходит в коллекцию со своим инстансом. */
	it('переставленный элемент входит со своим инстансом', async () => {
		await mount(`<div is="so-tabs" id="first">
				<div is="so-tabs-item" value="a" text="A"></div>
			</div>
			<div is="so-tabs" id="second"></div>`)

		const moved = pick('#first [value="a"]', isTab)

		const ctrl = moved.ctrl

		owner('#second').querySelector('.so-tabs__list')?.appendChild(moved)
		await flush()

		expect(ctrl).toBeInstanceOf(TTabsItem)
		expect(owner('#second').state.items).toEqual([ctrl])
		expect(owner('#first').state.items).toEqual([])
	})
})

/**
 * Tabs и Accordion: в движке ровно элементы разметки, по одному разу и в
 * порядке DOM, и клик работает с ним: активирует таб вместе с его панелью,
 * раскрывает секцию.
 */
describe('элементы разметки в движке владельца', () => {
	const tabs = () => [...document.querySelectorAll('[role="tab"]')]

	function tab(text: string): HTMLElement {
		const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

		if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

		return found
	}

	/** Тексты показанных панелей: неактивная панель скрыта и пуста. */
	const panels = () =>
		[...document.querySelectorAll('.so-tabs__panel')]
			.filter((panel) => panel instanceof HTMLElement && panel.style.display !== 'none')
			.map((panel) => panel.textContent?.trim())

	const headers = () => [...document.querySelectorAll('.so-accordion-item__header')]

	function header(text: string): HTMLElement {
		const found = headers().find((candidate) => candidate.textContent?.trim() === text)

		if (!(found instanceof HTMLElement)) throw new Error(`секции «${text}» нет`)

		return found
	}

	const expanded = () => headers().map((node) => node.getAttribute('aria-expanded'))

	const TAB_SET = `<div is="so-tabs">
		<div is="so-tabs-item" value="a" text="A" active></div>
		<div is="so-tabs-item" value="b" text="B"></div>
		<div is="so-tabs-item" value="c" text="C"></div>
		<div is="so-tabs-content" slot="content" value="a">Панель A</div>
		<div is="so-tabs-content" slot="content" value="b">Панель B</div>
		<div is="so-tabs-content" slot="content" value="c">Панель C</div>
	</div>`

	const SECTIONS = `<div is="so-accordion">
		<div is="so-accordion-item" value="a" text="A" selected>Содержимое A</div>
		<div is="so-accordion-item" value="b" text="B">Содержимое B</div>
		<div is="so-accordion-item" value="c" text="C">Содержимое C</div>
	</div>`

	it('табы: в движке ровно табы разметки; клик активирует таб и его панель', async () => {
		await mount(TAB_SET)

		expect(valuesOf(owner('[is="so-tabs"]'))).toEqual(['a', 'b', 'c'])
		expect(panels()).toEqual(['Панель A'])

		tab('B').click()
		await flush()

		expect(tabs().map((row) => row.getAttribute('aria-selected'))).toEqual([
			'false',
			'true',
			'false',
		])
		expect(panels()).toEqual(['Панель B'])
	})

	it('секции: в движке ровно секции разметки; клик раскрывает секцию', async () => {
		await mount(SECTIONS)

		expect(valuesOf(owner('[is="so-accordion"]'))).toEqual(['a', 'b', 'c'])
		expect(expanded()).toEqual(['true', 'false', 'false'])

		// Режим по умолчанию — одна раскрытая секция
		header('B').click()
		await flush()

		expect(expanded()).toEqual(['false', 'true', 'false'])
	})

	/**
	 * Владелец, переставленный в документе, собирается заново — новый движок,
	 * — и его элементы собираются вслед за ним: в живом движке ровно элементы
	 * разметки.
	 */
	it('набор табов переставлен: в новом движке ровно табы разметки', async () => {
		const host = await mount(TAB_SET)
		const el = owner('[is="so-tabs"]', host)
		const engines: unknown[] = []

		el.addEventListener('so:engine:create', (event) => {
			if (event instanceof CustomEvent) engines.push(event.detail)
		})
		document.body.appendChild(document.createElement('section')).appendChild(el)
		await flush()

		expect(engines).toHaveLength(1)
		expect(valuesOf(el)).toEqual(['a', 'b', 'c'])

		tab('C').click()
		await flush()

		expect(panels()).toEqual(['Панель C'])
	})

	it('аккордеон снят и вставлен заново: в новом движке ровно секции разметки', async () => {
		const host = await mount(SECTIONS)
		const el = owner('[is="so-accordion"]', host)

		el.remove()
		host.appendChild(el)
		await flush()

		expect(valuesOf(el)).toEqual(['a', 'b', 'c'])

		header('C').click()
		await flush()

		expect(expanded()).toEqual(['false', 'false', 'true'])
	})
})
