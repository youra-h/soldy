/**
 * Tabs под Web Components — набор вкладок на движке коллекций.
 *
 * Сценарии — те же, что у Angular (`tabs.spec.ts`), React и Vue, без сервера:
 * панель по активному табу и ARIA-связка «таб ↔ панель», кнопка закрытия,
 * клавиатура по APG Tabs.
 *
 * Своё у Web Components — разметка и сборка. Корень набора, таба и панели —
 * элемент потребителя (`<div is="so-tabs">`, `<div is="so-tabs-item">`,
 * `<div is="so-tabs-content" slot="content">`). Таб входит в коллекцию, когда
 * собирается: движок набора он находит лифтом вверх по документу, а
 * подключение таба, пришедшее во время подключения набора, ждёт его конца.
 * Неактивную панель убрать нельзя — элемент написал потребитель, — поэтому она
 * скрыта, а её содержимое вне документа. Слоты таба — свет его строки и кнопки
 * закрытия (свет детали). Scope у слотов нет: слоты табов из данных — образцы
 * (`<template slot="item-leading">`), копию которых получает каждый таб.
 * Отрисовка — микрозадачей после смены ядра, слушатели плагинов — кадром позже.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { TIcon, createEngineTabs } from '@soldy-ui/core'
import { TBasePlugin, type IPluginContext } from '@soldy-ui/plugins'
import {
	TabsCollectionContentDescriptor,
	TabsContentDescriptor,
	TabsDescriptor,
	TabsItemDescriptor,
	usePlugins,
} from '@soldy-ui/setup'
import {
	TTabsContentElement,
	TTabsElement,
	TTabsItemElement,
	type TTabsContentElementProps,
	type TTabsElementProps,
	type TTabsItemElementProps,
} from '@soldy-ui/webc'
import { tabsTemplate } from '../src/components/tabs/tabs.template'
import { tabsItemTemplate } from '../src/components/tabs/item/tabs-item.template'
import { tabsContentTemplate } from '../src/components/tabs/content/tabs-content.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	vi.restoreAllMocks()
	document.body.innerHTML = ''
})

function isTabs(node: Element | null): node is TTabsElementProps {
	return node instanceof TTabsElement
}

function isTab(node: Element | null): node is TTabsItemElementProps {
	return node instanceof TTabsItemElement
}

function isPanel(node: Element | null): node is TTabsContentElementProps {
	return node instanceof TTabsContentElement
}

/** Разметка, подключённая к документу; корень — её первый элемент. */
async function mount(html: string): Promise<HTMLElement> {
	const host = document.createElement('div')

	host.innerHTML = html
	document.body.appendChild(host)
	// Табы, вошедшие позже первого, переписывают ему состояние — оно доходит
	// до разметки на отрисовке
	await flush()

	return host
}

/** Набор вкладок в разметке; нет его — тест падает здесь. */
function tabsIn(host: ParentNode): TTabsElementProps {
	const node = host.querySelector('[is="so-tabs"]')

	if (!isTabs(node)) throw new Error('<div is="so-tabs"> нет')

	return node
}

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/**
 * Строки показанных табов. Таб разметки, закрытый крестиком, уходит из
 * коллекции, и его корень прячется (`rendered = false`): элемент написал
 * потребитель, и убрать его компонент не может.
 */
const tabs = (): HTMLElement[] =>
	[...document.querySelectorAll('[role="tab"]')].filter((row): row is HTMLElement => {
		const root = row.closest('.so-tabs-item')

		return (
			row instanceof HTMLElement &&
			(!(root instanceof HTMLElement) || root.style.display !== 'none')
		)
	})

/** Строка таба по тексту; нет её — тест падает здесь. */
function tab(text: string): HTMLElement {
	const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

	if (!found) throw new Error(`таба «${text}» нет`)

	return found
}

/** Элемент таба по тексту строки; нет его — тест падает здесь. */
function item(text: string): TTabsItemElementProps {
	const found =
		[...document.querySelectorAll('.so-tabs-item')].find(
			(candidate) => candidate.querySelector('[role="tab"]')?.textContent?.trim() === text,
		) ?? null

	if (!isTab(found)) throw new Error(`таба «${text}» нет`)

	return found
}

/** Кнопка закрытия таба; нет её — тест падает здесь. */
const closeOf = (text: string) => find(item(text), '.so-tabs-item__close', HTMLButtonElement)

/** Показанные панели: неактивная панель — скрытый элемент потребителя. */
const panels = () =>
	[...document.querySelectorAll('.so-tabs__panel')].filter(
		(node): node is HTMLElement => node instanceof HTMLElement && node.style.display !== 'none',
	)

/** Единственная показанная панель; их не одна — тест падает здесь. */
function panel(): HTMLElement {
	const shown = panels()

	if (shown.length !== 1) throw new Error(`показанных панелей ${shown.length}, а не одна`)

	return shown[0]
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

/** Табы и панели из разметки — как `TabsContent.test.vue` у Vue. */
const HARNESS = `<div is="so-tabs">
	<div is="so-tabs-item" value="a" text="First" active></div>
	<div is="so-tabs-item" value="b" text="Second"></div>
	<div is="so-tabs-content" slot="content" value="a">Панель A</div>
	<div is="so-tabs-content" slot="content" value="b">Панель B</div>
</div>`

const ITEMS = [
	{ value: 'a', text: 'A', _: { active: true } },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

/** Набор вкладок кодом: пропсы свойствами и свет — до вставки. */
async function mountTabs(props: Record<string, unknown>, light = ''): Promise<TTabsElementProps> {
	const el = document.createElement('div', { is: 'so-tabs' })

	if (!isTabs(el)) throw new Error('<div is="so-tabs"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	el.innerHTML = light
	document.body.appendChild(el)
	await flush()

	return el
}

describe('показ панели по активному табу', () => {
	it('видна только панель активного таба', async () => {
		await mount(HARNESS)

		expect(panel().textContent).toBe('Панель A')
	})

	it('переключение таба переключает панель', async () => {
		await mount(HARNESS)

		await click(tab('Second'))

		expect(panel().textContent).toBe('Панель B')
	})

	/** Неактивная панель скрыта, и её содержимого в документе нет. */
	it('скрытая панель — без содержимого', async () => {
		await mount(HARNESS)

		const hidden = [...document.querySelectorAll('.so-tabs__panel')].filter(
			(node) => node instanceof HTMLElement && node.style.display === 'none',
		)

		expect(hidden.map((node) => node.textContent)).toEqual([''])
	})

	it('панель лежит вне списка табов', async () => {
		await mount(HARNESS)

		expect(document.querySelector('[role="tablist"] .so-tabs__panel')).toBeNull()
		expect(panels()).toHaveLength(1)
	})

	it('панель вне Tabs скрыта и пуста: таба, по которому её показывать, нет', async () => {
		const host = await mount(`<div is="so-tabs-content" value="a">Панель A</div>`)
		const alone = host.firstElementChild

		if (!isPanel(alone)) throw new Error('панели нет')

		expect(alone.style.display).toBe('none')
		expect(alone.textContent).toBe('')
	})

	/**
	 * Таб, пришедший после панели, панель находит, когда он входит в
	 * коллекцию: на `item:added` она подписана с приёма своего контекста.
	 * Таб, добавленный после построения набора, в список сам не встаёт, —
	 * потребитель ставит его туда.
	 */
	it('таб, вошедший после панели, панель находит при его входе', async () => {
		const host = await mount(`<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="First" active></div>
			<div is="so-tabs-content" slot="content" value="a">Панель A</div>
			<div is="so-tabs-content" slot="content" value="b">Панель B</div>
		</div>`)

		expect(panel().textContent).toBe('Панель A')

		find(host, '.so-tabs__list', HTMLElement).insertAdjacentHTML(
			'beforeend',
			'<div is="so-tabs-item" value="b" text="Second" active></div>',
		)
		await flush()

		expect(panel().textContent).toBe('Панель B')
		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('панель внутри [role=tablist] — предупреждение TTabsContentWarnPlugin', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		await mount(`<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="First" active></div>
			<div is="so-tabs-content" value="a">Панель A</div>
		</div>`)

		// Плагин смотрит узел по `ready`, то есть кадром позже
		await nextFrame()

		const warnings = warn.mock.calls
			.map(([message]) => String(message))
			.filter((text) => text.includes('Tabs.Content'))

		expect(warnings).toHaveLength(1)
		expect(warnings[0]).toContain('[role="tablist"]')
	})

	it('панель в слоте content — без предупреждения', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		await mount(HARNESS)
		await nextFrame()

		expect(warn).not.toHaveBeenCalled()
	})

	/**
	 * Содержимое неактивной панели вне документа, как у Vue, где неактивная
	 * панель не рисуется: её поля с формой не уходят.
	 */
	it('поле неактивной панели — не в FormData, показ возвращает его', async () => {
		const host = await mount(`<form><div is="so-tabs">
			<div is="so-tabs-item" value="a" text="First" active></div>
			<div is="so-tabs-item" value="b" text="Second"></div>
			<div is="so-tabs-content" slot="content" value="a"><input name="a" value="1" /></div>
			<div is="so-tabs-content" slot="content" value="b"><input name="b" value="2" /></div>
		</div></form>`)
		const form = find(host, 'form', HTMLFormElement)

		expect([...new FormData(form)]).toEqual([['a', '1']])

		await click(tab('Second'))

		expect([...new FormData(form)]).toEqual([['b', '2']])
	})
})

/**
 * Тема рисует вид набора от его корня дочерними комбинаторами — свой список,
 * его табы и свою панель (`themes/oren/AGENTS.md`, «Tabs: вид — от своего
 * списка»). Держится это на разметке: список и панели — дети корня, табы —
 * дети списка.
 */
describe('разметка, на которую опирается тема', () => {
	/** Табы набора — дети списка, список и показанная панель — дети корня. */
	function expectOwnParts(root: HTMLElement, count: number): void {
		const list = find(root, ':scope > .so-tabs__list', HTMLElement)
		const tabItems = [...document.querySelectorAll('.so-tabs-item')]

		expect(panel().parentElement).toBe(root)
		expect(tabItems).toHaveLength(count)

		for (const tabItem of tabItems) expect(tabItem.parentElement).toBe(list)
	}

	it('табы разметки — дети списка, список и панель — дети корня', async () => {
		expectOwnParts(tabsIn(await mount(HARNESS)), 2)
	})

	it('табы из items — дети списка, список и панель — дети корня', async () => {
		const el = await mountTabs(
			{ items: ITEMS },
			'<div is="so-tabs-content" slot="content" value="a">Панель A</div>',
		)

		expectOwnParts(el, ITEMS.length)
	})

	it('табы из items — в порядке данных, каждый с инстансом своего элемента', async () => {
		const el = await mountTabs({ items: ITEMS })
		const rendered = [...el.querySelectorAll('.so-tabs-item')]

		expect(rendered.map((node) => (isTab(node) ? node.ctrl : null))).toEqual(el.state.shown)
		expect(tabs().map((row) => row.textContent)).toEqual(['A', 'B', 'C'])
	})
})

/**
 * Панель с `value`: так потребитель переносит её к другому табу. Табы `a`
 * (активен) и `b`, таба `z` нет. Смена `value` меняет у панели таб, и показ
 * обязан идти за новым табом сразу, а не со следующей активацией.
 */
describe('смена value у панели', () => {
	async function mountValue(value: string): Promise<TTabsContentElementProps> {
		const host = await mount(`<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="First" active></div>
			<div is="so-tabs-item" value="b" text="Second"></div>
			<div is="so-tabs-content" slot="content" value="a">Панель</div>
		</div>`)
		const node = host.querySelector('[is="so-tabs-content"]')

		if (!isPanel(node)) throw new Error('панели нет')

		node.value = value
		await flush()

		return node
	}

	it('к неактивному табу — панель прячется, его активация показывает её', async () => {
		const content = await mountValue('a')

		expect(panels()).toHaveLength(1)

		content.value = 'b'
		await flush()

		expect(panels()).toHaveLength(0)

		await click(tab('Second'))

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('к значению без таба — панель прячется и за прежним табом не идёт', async () => {
		const content = await mountValue('a')

		content.value = 'z'
		await flush()

		expect(panels()).toHaveLength(0)

		// Прежний таб снова активен — панель уже не его
		await click(tab('Second'))
		await click(tab('First'))

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(panels()).toHaveLength(0)
	})

	it('из значения без таба к активному табу — панель видна и подписана им', async () => {
		const content = await mountValue('z')

		expect(panels()).toHaveLength(0)

		content.value = 'a'
		await flush()

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})
})

describe('связка ARIA в разметке', () => {
	it('aria-controls активного таба указывает на id его панели', async () => {
		await mount(HARNESS)

		expect(tab('First').getAttribute('aria-controls')).toBe(panel().id)
	})

	it('aria-labelledby панели указывает на id таба', async () => {
		await mount(HARNESS)

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})

	it('панель объявлена как tabpanel', async () => {
		await mount(HARNESS)

		expect(panel().getAttribute('role')).toBe('tabpanel')
	})
})

describe('aria-selected', () => {
	it('находится на элементе с role="tab", а не на обёртке', async () => {
		await mount(HARNESS)

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(tab('Second').getAttribute('aria-selected')).toBe('false')
		expect(item('First').hasAttribute('aria-selected')).toBe(false)
	})

	it('следует за переключением таба', async () => {
		await mount(HARNESS)

		await click(tab('Second'))

		expect(tab('First').getAttribute('aria-selected')).toBe('false')
		expect(tab('Second').getAttribute('aria-selected')).toBe('true')
	})

	it('тема читает активность с корня таба: data-selected', async () => {
		await mount(HARNESS)

		expect(item('First').dataset['selected']).toBe('true')
		expect(item('Second').dataset['selected']).toBe('false')
		expect(tab('First').hasAttribute('data-selected')).toBe(false)
	})

	/** Ряд табов — флексбокс: таб стоит по номеру в коллекции, а не по месту в разметке. */
	it('место в коллекции — order корня таба', async () => {
		await mount(HARNESS)

		expect([item('First').style.order, item('Second').style.order]).toEqual(['0', '1'])
	})
})

describe('таб из разметки', () => {
	it('клик потребителя по табу не отменяет активацию', async () => {
		await mount(HARNESS)

		const clicks = vi.fn()

		item('Second').addEventListener('click', clicks)
		await click(tab('Second'))

		expect(clicks).toHaveBeenCalledTimes(1)
		expect(tab('Second').getAttribute('aria-selected')).toBe('true')
	})

	it('класс и стиль потребителя — корню таба, id, title, aria-label и data-* — строке', async () => {
		await mount(`<div is="so-tabs">
			<div
				is="so-tabs-item"
				value="a"
				text="A"
				active
				class="mine"
				style="color: red"
				id="pick-a"
				title="Раздел"
				aria-label="Раздел А"
				data-testid="tab-a"
			></div>
		</div>`)

		const row = tab('A')
		const root = item('A')

		expect(root.classList.contains('mine')).toBe(true)
		expect(root.style.color).toBe('red')
		expect(
			['id', 'title', 'aria-label', 'data-testid'].filter((n) => root.hasAttribute(n)),
		).toEqual([])
		expect(row.getAttribute('title')).toBe('Раздел')
		expect(row.getAttribute('aria-label')).toBe('Раздел А')
		expect(row.dataset['testid']).toBe('tab-a')
		expect(row.classList.contains('mine')).toBe(false)
	})

	/**
	 * `id` своего у строки нет — его пишет плагин связок от монтирования, — и
	 * `id` разметки потребителя главнее: он стоит на строке, как атрибут
	 * снаружи у Vue и React, и с ним же связывается панель.
	 */
	it('id разметки — на строке, и панель ссылается на него', async () => {
		await mount(`<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="A" active id="pick-a"></div>
			<div is="so-tabs-content" slot="content" value="a">Панель A</div>
		</div>`)

		expect(tab('A').id).toBe('pick-a')
		expect(document.querySelectorAll('#pick-a')).toHaveLength(1)
	})

	it('default таба — свет строки вместо text', async () => {
		await mount(`<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="A" active><b class="own">Свой</b></div>
			<div is="so-tabs-item" value="b" text="B"></div>
		</div>`)

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['Свой', 'B'])
		expect(find(tab('Свой'), '.so-button__text .own', HTMLElement).textContent).toBe('Свой')

		item('Свой').text = 'Другой'
		await flush()

		expect(tab('Свой').textContent?.trim()).toBe('Свой')
	})

	it('без leading и trailing обёрток краёв списка нет', async () => {
		await mountTabs({ items: ITEMS })

		expect(document.querySelector('.so-tabs__list--leading')).toBeNull()
		expect(document.querySelector('.so-tabs__list--trailing')).toBeNull()
	})

	it('leading и trailing — в обёртках по краям списка, табы между ними', async () => {
		const el = await mountTabs(
			{ items: ITEMS.slice(0, 2) },
			'<i slot="trailing" class="tail">после</i><i slot="leading" class="head">до</i>',
		)
		const list = find(el, '.so-tabs__list', HTMLElement)

		expect([...list.children].map((node) => node.className.split(' ')[0])).toEqual([
			'so-tabs__list--leading',
			'so-tabs-item',
			'so-tabs-item',
			'so-tabs__list--trailing',
		])
		expect(find(list, '.so-tabs__list--leading .head', HTMLElement).textContent).toBe('до')
		expect(find(list, '.so-tabs__list--trailing .tail', HTMLElement).textContent).toBe('после')
	})

	it('пропсы фасада — свойства, не атрибуты; атрибуты потребителя — атрибуты', async () => {
		const el = await mountTabs({ items: ITEMS, title: 'Разделы' })

		expect(el.hasAttribute('items')).toBe(false)
		expect(el.getAttribute('title')).toBe('Разделы')
		expect(el.items).toEqual(el.state.items)
		expect(el.state.items?.map((each) => each.value)).toEqual(['a', 'b', 'c'])
	})
})

describe('кнопка закрытия: разметка', () => {
	const CLOSABLE = `<div is="so-tabs" closable>
		<div is="so-tabs-item" value="settings" text="Настройки" active></div>
		<div is="so-tabs-item" value="mail" text="Почта"></div>
	</div>`

	it('у таба нет интерактивного потомка', async () => {
		await mount(CLOSABLE)

		expect(tabs()).toHaveLength(2)

		for (const row of tabs()) {
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе таба сразу после строки', async () => {
		await mount(CLOSABLE)

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row.getAttribute('role')).toBe('tab')
		expect(close.tagName).toBe('BUTTON')
		expect(close.classList.contains('so-tabs-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое таба не входит', async () => {
		await mount(CLOSABLE)

		expect(tab('Настройки').textContent?.trim()).toBe('Настройки')
		expect(tab('Настройки').querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})

	/** Строка и крестик — детали разметки таба: элементы soldy с именами места. */
	it('строка, крестик и его иконка — детали с именами места и type="button"', async () => {
		await mount(CLOSABLE)

		const icon = closeOf('Настройки').querySelector('.so-icon')

		expect(tab('Настройки').getAttribute('embedded')).toBe('tabs.row')
		expect(tab('Настройки').getAttribute('type')).toBe('button')
		expect(closeOf('Настройки').getAttribute('embedded')).toBe('tabs.close')
		expect(closeOf('Настройки').getAttribute('type')).toBe('button')
		expect(icon?.getAttribute('embedded')).toBe('tabs.close-icon')
		expect(icon?.getAttribute('icon')).toBe('close')
	})

	it('без closable кнопки нет, в элементе одна строка', async () => {
		await mount(
			`<div is="so-tabs"><div is="so-tabs-item" value="a" text="A" active></div></div>`,
		)

		expect(document.querySelector('.so-tabs-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('слот close-icon подменяет иконку крестика', async () => {
		await mount(`<div is="so-tabs" closable>
			<div is="so-tabs-item" value="a" text="A" active><b slot="close-icon" class="custom">×</b></div>
		</div>`)

		expect(closeOf('A').querySelector('.custom')).not.toBeNull()
		expect(closeOf('A').querySelector('.so-icon')).toBeNull()
		// Слот крестика — не содержимое строки: текст таба на месте
		expect(tab('A').textContent?.trim()).toBe('A')
	})
})

describe('кнопка закрытия: поведение', () => {
	it('клик закрывает таб и не активирует его', async () => {
		await mountTabs({ items: ITEMS, closable: true })

		await click(closeOf('B'))

		// Если бы клик сначала активировал «B», закрытие активного таба отдало
		// бы активность соседу — «C»
		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(tab('A').getAttribute('aria-selected')).toBe('true')
	})

	/**
	 * Нажатие по крестику — не нажатие по табу и не по набору: корни обоих
	 * слушают нативный клик (`TActionPlugin`), и всплывший до них клик дал бы
	 * им `action:press`.
	 */
	it('клик по крестику не даёт so:action:press ни табу, ни набору', async () => {
		const host = await mount(`<div is="so-tabs" closable>
			<div is="so-tabs-item" value="a" text="A" active></div>
			<div is="so-tabs-item" value="b" text="B"></div>
		</div>`)
		const setPresses = vi.fn()
		const tabPresses = vi.fn()

		tabsIn(host).addEventListener('so:action:press', (event) => {
			if (event.target === event.currentTarget) setPresses()
		})
		item('B').addEventListener('so:action:press', (event) => {
			if (event.target === event.currentTarget) tabPresses()
		})

		// Слушатели корней `TActionPlugin` вешает кадром позже, по `ready`
		await nextFrame()

		const closed = item('B')

		await click(closeOf('B'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A'])
		expect(closed.style.display).toBe('none')
		expect(tabPresses).not.toHaveBeenCalled()
		expect(setPresses).not.toHaveBeenCalled()

		// Клик по строке до корней доходит: слушатели на месте
		await click(tab('A'))

		expect(setPresses).toHaveBeenCalledTimes(1)
	})

	it('размер кнопки — размер таба: от него считается кегль иконки', async () => {
		await mount(`<div is="so-tabs" closable size="lg">
			<div is="so-tabs-item" value="a" text="A" active></div>
		</div>`)

		expect(closeOf('A').classList.contains('so-button--size-lg')).toBe(true)
		expect(closeOf('A').querySelector('.so-icon--size-lg')).not.toBeNull()
	})

	/**
	 * `closable` таба трёхзначен: `undefined` значит «как у набора». Снятое
	 * свойство возвращает таб к значению набора; атрибут булева пропа снимается
	 * в `false`, по HTML-семантике.
	 */
	it('false у таба прячет кнопку, undefined возвращает её от набора', async () => {
		await mount(`<div is="so-tabs" closable>
			<div is="so-tabs-item" value="a" text="A" active></div>
		</div>`)

		item('A').closable = false
		await flush()

		expect(item('A').querySelector('.so-tabs-item__close')).toBeNull()

		item('A').closable = undefined
		await flush()

		expect(item('A').querySelector('.so-tabs-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный таб не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного таба кнопки закрытия нет', () => {
	const DISABLED = `<div is="so-tabs" closable>
		<div is="so-tabs-item" value="a" text="A" active></div>
		<div is="so-tabs-item" value="b" text="B" disabled></div>
		<div is="so-tabs-item" value="c" text="C"></div>
	</div>`

	/** Табы, у которых есть кнопка закрытия, — по тексту строки. */
	const withClose = () =>
		['A', 'B', 'C'].filter((text) => item(text).querySelector('.so-tabs-item__close'))

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

	it('выключили набор — кнопок нет ни у одного таба, включили — вернулись', async () => {
		const el = tabsIn(await mount(DISABLED))

		el.disabled = true
		await flush()

		expect(withClose()).toEqual([])

		el.disabled = false
		await flush()

		// `disabled` набора распространяется на всех: включение включает и «B»
		expect(withClose()).toEqual(['A', 'B', 'C'])
	})
})

describe('клавиатура', () => {
	const ABC = `<div is="so-tabs" aria_label="Разделы">
		<div is="so-tabs-item" value="a" text="A"></div>
		<div is="so-tabs-item" value="b" text="B" active></div>
		<div is="so-tabs-item" value="c" text="C"></div>
	</div>`

	it('tabindex="0" ровно у одного таба — у активного', async () => {
		await mount(ABC)

		const stops = document.querySelectorAll('[role="tab"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(tab('B'))
		expect(tab('A').getAttribute('tabindex')).toBe('-1')
		expect(tab('C').getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка закрытия — не остановка Tab', async () => {
		const el = tabsIn(await mount(ABC))

		el.closable = true
		await flush()

		const closes = [...document.querySelectorAll('.so-tabs-item__close')]

		expect(closes).toHaveLength(3)
		expect(closes.every((close) => close.getAttribute('tabindex') === '-1')).toBe(true)
	})

	it('tablist объявляет ориентацию и имя из aria_label', async () => {
		const el = tabsIn(await mount(ABC))

		el.orientation = 'vertical'
		await flush()

		const list = document.querySelector('.so-tabs__list')

		expect(list?.getAttribute('role')).toBe('tablist')
		expect(list?.getAttribute('aria-orientation')).toBe('vertical')
		expect(list?.getAttribute('aria-label')).toBe('Разделы')
	})

	it('корень ARIA списка не получает — рядом со списком лежат панели', async () => {
		const root = tabsIn(await mount(ABC))

		expect(root.hasAttribute('role')).toBe(false)
		expect(root.hasAttribute('aria-label')).toBe(false)
	})

	it('→ переносит фокус на строку следующего таба и активирует его', async () => {
		await mount(ABC)

		// Клавиатура набора слушает корень с `element:ready` — через кадр
		await nextFrame()

		tab('B').focus()
		await press(tab('B'), 'ArrowRight')

		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
		expect(tab('B').getAttribute('aria-selected')).toBe('false')
		expect(tab('C').getAttribute('tabindex')).toBe('0')
		expect(tab('B').getAttribute('tabindex')).toBe('-1')
	})

	it('Delete закрывает таб, фокус остаётся в списке — на соседе', async () => {
		await mountTabs({
			closable: true,
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B', _: { active: true } },
				{ value: 'c', text: 'C' },
			],
		})

		await nextFrame()

		tab('B').focus()
		await press(tab('B'), 'Delete')

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
	})
})

/**
 * Свет детали: слоты таба — свет его строки и кнопки закрытия. Узлы встают в
 * деталь, пока та ждёт своей сборки, и деталь раскладывает их по назначенному
 * слоту, а не по атрибуту `slot` — у текста его нет вовсе. Элемент soldy в
 * свете таба переезжает в строку переносом силами базы и собирается один раз.
 */
describe('свет детали', () => {
	/** Иконки, на которые встал плагин приложения, — по одной на сборку. */
	const installed: unknown[] = []

	class TProbePlugin extends TBasePlugin<TIcon> {
		override install(ctx: IPluginContext, options?: unknown): void {
			super.install(ctx, options)

			installed.push(ctx.getInstance())
		}
	}

	it('иконка leading таба — в строке перед текстом, собрана один раз', async () => {
		installed.length = 0

		const dispose = usePlugins(TIcon, [TProbePlugin])

		try {
			await mount(`<div is="so-tabs">
				<div is="so-tabs-item" value="a" text="A" active>
					<span is="so-icon" slot="leading" icon="check" class="probe"></span>
				</div>
			</div>`)

			const row = tab('A')
			const icon = find(row, '.probe', HTMLSpanElement)

			expect(icon.parentElement).toBe(row)
			expect(icon.nextElementSibling?.classList.contains('so-button__text')).toBe(true)
			expect(icon.classList.contains('so-icon')).toBe(true)
			expect(installed).toHaveLength(1)
		} finally {
			dispose()
		}
	})

	it('trailing таба — в строке после текста', async () => {
		await mount(`<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="A" active><i slot="trailing" class="tail">!</i></div>
		</div>`)

		const row = tab('A!')

		expect(row.lastElementChild?.classList.contains('tail')).toBe(true)
		expect(
			row.lastElementChild?.previousElementSibling?.classList.contains('so-button__text'),
		).toBe(true)
	})

	it('close-icon — в кнопке закрытия, текст таба на месте', async () => {
		await mount(`<div is="so-tabs" closable>
			<div is="so-tabs-item" value="a" text="A" active><b slot="close-icon" class="custom">×</b></div>
		</div>`)

		expect(find(closeOf('A'), '.so-button__text .custom', HTMLElement).textContent).toBe('×')
		expect(tab('A').querySelector('.custom')).toBeNull()
	})
})

/**
 * Слоты табов из данных — образцы: scope у слотов Web Components нет, и
 * владелец кладёт копию одного образца в каждый свой таб из данных — в его
 * слот, назначением, вместе с текстом.
 */
describe('образцы item-* набора', () => {
	it('копия в каждом табе из данных, в его слоте, с текстом', async () => {
		await mountTabs(
			{ items: ITEMS.slice(0, 2) },
			`<template slot="item-leading">★ <u class="lead">до</u></template>
			<template slot="item-trailing"><s class="trail">после</s></template>`,
		)

		expect(tabs().map((row) => row.textContent)).toEqual(['★ доAпосле', '★ доBпосле'])

		for (const row of tabs()) {
			const text = find(row, '.so-button__text', HTMLElement)

			expect(row.firstChild?.textContent).toBe('★ ')
			expect(text.previousElementSibling?.classList.contains('lead')).toBe(true)
			expect(text.nextElementSibling?.classList.contains('trail')).toBe(true)
		}
	})

	it('item — копия вместо текста у каждого таба, образца нет в документе', async () => {
		const el = await mountTabs(
			{ items: ITEMS.slice(0, 2) },
			'<template slot="item"><b class="own">Свой</b></template>',
		)

		expect(tabs().map((row) => row.querySelector('.so-button__text')?.textContent)).toEqual([
			'Свой',
			'Свой',
		])
		expect(el.querySelector('template')).toBeNull()
	})

	it('образец — не только <template>: копия элемента, без атрибута slot', async () => {
		await mountTabs({ items: ITEMS.slice(0, 2) }, '<i slot="item-leading" class="lead">*</i>')

		const copies = [...document.querySelectorAll('.lead')]

		expect(copies).toHaveLength(2)
		expect(copies.every((copy) => !copy.hasAttribute('slot'))).toBe(true)
		expect(copies.every((copy) => copy.parentElement?.getAttribute('role') === 'tab')).toBe(
			true,
		)
	})

	it('item-close-icon — у каждого таба вместо своей иконки', async () => {
		await mountTabs(
			{ items: ITEMS.slice(0, 2), closable: true },
			'<template slot="item-close-icon"><b class="probe">×</b></template>',
		)

		expect(
			[...document.querySelectorAll('.so-tabs-item__close')].map((close) =>
				close.querySelector('.probe')
					? 'slot'
					: close.querySelector('.so-icon')
						? 'icon'
						: 'empty',
			),
		).toEqual(['slot', 'slot'])
	})

	/** Пустой образец ничего не кладёт: слот таба не задан, и таб рисует своё. */
	it('пустой образец — у таба своя иконка', async () => {
		await mountTabs(
			{ items: ITEMS.slice(0, 2), closable: true },
			'<template slot="item-close-icon">  </template>',
		)

		expect(
			[...document.querySelectorAll('.so-tabs-item__close')].map(
				(close) => close.querySelector('.so-icon') !== null,
			),
		).toEqual([true, true])
	})

	it('табы из items без образца — своя иконка у каждого', async () => {
		await mountTabs({ items: ITEMS, closable: true })

		expect(
			[...document.querySelectorAll('.so-tabs-item__close')].map(
				(close) => close.querySelector('.so-icon svg') !== null,
			),
		).toEqual([true, true, true])
	})

	/** Таб из данных — элемент своей коллекции, а не деталь: признака места у него нет. */
	it('таб из данных без embedded', async () => {
		await mountTabs({ items: ITEMS })

		expect(
			[...document.querySelectorAll('.so-tabs-item')].some((node) =>
				node.hasAttribute('embedded'),
			),
		).toBe(false)
	})

	/**
	 * Петля по ключу: запись выборки новая на каждую смену, а элемент таба —
	 * тот же, пока жив его ключ (`uid`). Переставленный едет переносом силами
	 * базы и не пересобирается, ушедший снимается.
	 */
	it('перестановка и удаление в движке: живые табы — те же узлы, порядок DOM — порядок данных', async () => {
		const engine = createEngineTabs({ items: ITEMS })
		const el = await mountTabs({ engine })
		const before = new Map(
			[...el.querySelectorAll('.so-tabs-item')].map((node) => [
				node.querySelector('[role="tab"]')?.textContent,
				node,
			]),
		)
		const [a, b, c] = engine.extensions.batch.items
		const bundles: unknown[] = []

		el.addEventListener('so:bundle:create', (event) => bundles.push(event.target))
		engine.extensions.plain.move(c, 0)
		engine.extensions.plain.remove(b)
		await flush()

		expect(engine.extensions.batch.shown).toEqual([c, a])
		expect(tabs().map((row) => row.textContent)).toEqual(['C', 'A'])
		expect([...el.querySelectorAll('.so-tabs-item')]).toEqual([
			before.get('C'),
			before.get('A'),
		])
		expect(before.get('B')?.isConnected).toBe(false)
		// Переставленные не пересобраны: наборов плагинов заново никто не создал
		expect(bundles).toEqual([])
	})
})

/**
 * Набор, переставленный в документе, собирается заново, как любой элемент
 * soldy: новая связка — новый фасад. Состав и выбор живут в движке, и движок
 * снаружи с табами из данных переставленный набор подхватывает целиком —
 * табы те же, активный тот же. Своего движка набор после перестановки не
 * держит: табы разметки входят в коллекцию заново, с тем, что задано их
 * атрибутами и свойствами (`docs/architecture.md`, Layer 8d, «Известные
 * ограничения»).
 */
describe('перестановка набора', () => {
	it('движок снаружи: табы — те же узлы, активный — тот же', async () => {
		const engine = createEngineTabs({ items: ITEMS })
		const el = await mountTabs({ engine })
		const rows = () =>
			tabs().map((row) => `${row.textContent}:${row.getAttribute('aria-selected')}`)

		await click(tab('C'))

		const nodes = [...el.querySelectorAll('.so-tabs-item')]

		document.body.appendChild(document.createElement('section')).appendChild(el)
		await flush()

		expect(rows()).toEqual(['A:false', 'B:false', 'C:true'])
		expect([...el.querySelectorAll('.so-tabs-item')]).toEqual(nodes)
		expect(engine.extensions.activation.activeItem?.value).toBe('c')
	})
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	it.each([
		['Tabs', tabsTemplate, TabsDescriptor],
		['Tabs.Item', tabsItemTemplate, TabsItemDescriptor],
		['Tabs.Content', tabsContentTemplate, TabsContentDescriptor],
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
	it('пропсы фасада — свойства элементов', async () => {
		expectTypeOf<TTabsElementProps>().toHaveProperty('items')
		expectTypeOf<TTabsElementProps>().toHaveProperty('engine')
		expectTypeOf<TTabsElementProps>().toHaveProperty('trackBy')
		expectTypeOf<TTabsItemElementProps['active']>().toEqualTypeOf<boolean | undefined>()
	})

	it('состояние — вместе со свойствами фасада', async () => {
		expectTypeOf<TTabsElementProps['state']>().toHaveProperty('shown')
		expectTypeOf<TTabsItemElementProps['state']>().toHaveProperty('tab_closable')
		expectTypeOf<TTabsContentElementProps['state']>().toHaveProperty('active')
	})

	/** Активность панели вычисляет её таб: входа у панели нет — ни свойства, ни атрибута. */
	it('у панели active — только состояние, не вход', async () => {
		expectTypeOf<TTabsContentElementProps>().not.toHaveProperty('active')
		expect(TTabsContentElement.observedAttributes).not.toContain('active')
		expect(
			TabsCollectionContentDescriptor()
				.getProps()
				.find((prop) => prop.name.name === 'active')?.protected,
		).toBe(true)
	})
})
