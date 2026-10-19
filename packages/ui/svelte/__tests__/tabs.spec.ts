/**
 * Tabs в Svelte — вторая коллекция адаптера после ListBox.
 *
 * Сценарии — те же, что у React (`tabs.spec.tsx`) и Vue (`tabs-content`,
 * `tabs-close`, `tabs-keyboard`): панель по активному табу и ARIA-связка «таб
 * ↔ панель», кнопка закрытия, клавиатура по APG Tabs. Движок, расширения и
 * плагины перенесены без правок.
 *
 * Своё у Svelte — момент входа. Таб разметки входит в коллекцию при своей
 * инициализации, и панель, что стоит в документе после табов, находит его
 * уже в сборке (`TTabsContentBindingExtension`), а таб, вошедший позже, —
 * подпиской, которую ставит её `attach`. Сервер проверяет
 * `collections.server.spec.ts`.
 *
 * И крестик. Клик разметки Svelte делегирует корню приложения, и
 * `stopPropagation` там нативные слушатели `TActionPlugin` на корнях таба и
 * набора уже не остановит. Поэтому крестик закрывает по нативному клику своего
 * плагина (`onActionClick`) и гасит всплытие у самого события, как React.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { flushSync, type ComponentProps, type Snippet } from 'svelte'
import type { ITabsItem } from '@soldy-ui/core'
import {
	Tabs,
	TabsContent,
	TabsItem,
	type TabsContentProps,
	type TabsItemProps,
	type TabsProps,
} from '@soldy-ui/svelte'
import Harness from './Tabs.test.svelte'
import Slots from './TabsSlots.test.svelte'
import { find, htmlOf, mount, nextFrame } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { markup, scopeMarkup, scopeText } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

const tabs = () => [...document.querySelectorAll('[role="tab"]')]

/** Строка таба по тексту; нет её — тест падает здесь. */
function tab(text: string): HTMLElement {
	const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

	return found
}

/** Элемент таба по тексту строки; нет его — тест падает здесь. */
function item(text: string): HTMLElement {
	const found = [...document.querySelectorAll('.so-tabs-item')].find(
		(candidate) => candidate.querySelector('[role="tab"]')?.textContent?.trim() === text,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

	return found
}

/** Кнопка закрытия таба; нет её — тест падает здесь. */
function closeOf(text: string): HTMLElement {
	const close = item(text).querySelector('.so-tabs-item__close')

	if (!(close instanceof HTMLElement)) throw new Error(`у таба «${text}» нет кнопки закрытия`)

	return close
}

const panels = () => [...document.querySelectorAll('.so-tabs__panel')]

/** Единственная показанная панель; их не одна — тест падает здесь. */
function panel(): HTMLElement {
	const shown = panels()

	if (shown.length !== 1 || !(shown[0] instanceof HTMLElement)) {
		throw new Error(`показанных панелей ${shown.length}, а не одна`)
	}

	return shown[0]
}

function click(element: HTMLElement): void {
	element.click()
	flushSync()
}

/** Фокус на узел: `TActionPlugin` пишет его в `focused` таба. */
function focus(element: HTMLElement): void {
	element.focus()
	flushSync()
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string): void {
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	flushSync()
}

type THarnessProps = ComponentProps<typeof Harness>

/** Scope слотов таба: строки, проброса строки и проброса без своего scope. */
type TRowScope = { text: string; active: boolean }
type TItemRowScope = TRowScope & { item: ITabsItem }
type TItemScope = { item: ITabsItem }

/** Табы и панели из разметки — как `TabsContent.test.vue` у Vue. */
function harness(props: TabsProps = {}): THarnessProps {
	return {
		tabs: props,
		items: [
			{ value: 'a', text: 'First', active: true },
			{ value: 'b', text: 'Second' },
		],
		panels: [
			{ value: 'a', text: 'Панель A' },
			{ value: 'b', text: 'Панель B' },
		],
	}
}

const ITEMS = [
	{ value: 'a', text: 'A', _: { active: true } },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

describe('показ панели по активному табу', () => {
	it('видна только панель активного таба', () => {
		mount(Harness, harness())

		expect(panel().textContent).toBe('Панель A')
	})

	it('переключение таба переключает панель', () => {
		mount(Harness, harness())

		click(tab('Second'))

		expect(panel().textContent).toBe('Панель B')
	})

	it('панель лежит вне списка табов', () => {
		mount(Harness, harness())

		// Попади она в `children`, оказалась бы внутри [role=tablist]
		expect(document.querySelector('[role="tablist"] .so-tabs__panel')).toBeNull()
		expect(panels()).toHaveLength(1)
	})

	it('панель вне Tabs пуста: таба, по которому её показывать, нет', () => {
		const { container } = mount(TabsContent, {
			value: 'a',
			children: markup('<span>Панель A</span>'),
		})

		expect(htmlOf(container)).toBe('')
	})

	/**
	 * Таб, пришедший после панели, панель находит, когда он входит в
	 * коллекцию: на `item:added` она подписана со своего `attach`.
	 */
	it('таб, вошедший после панели, панель находит при его входе', () => {
		const props = reactiveProps<THarnessProps>({
			items: [{ value: 'a', text: 'First', active: true }],
			panels: harness().panels,
		})

		mount(Harness, props)

		expect(panel().textContent).toBe('Панель A')

		props.items = [
			{ value: 'a', text: 'First', active: false },
			{ value: 'b', text: 'Second', active: true },
		]
		flushSync()

		expect(panel().textContent).toBe('Панель B')
		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('панель внутри [role=tablist] — предупреждение TTabsContentWarnPlugin', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mount(Harness, {
			items: [{ value: 'a', text: 'First', active: true }],
			panels: [{ value: 'a', text: 'Панель A' }],
			panelsInList: true,
		})

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

		mount(Harness, harness())
		await nextFrame()

		expect(warn).not.toHaveBeenCalled()
	})
})

/**
 * Тема рисует вид набора от его корня дочерними комбинаторами — свой список,
 * его табы и свою панель (`themes/oren/AGENTS.md`, «Tabs: вид — от своего
 * списка»): правило для потомков досталось бы и табам в панели. Держится это
 * на разметке: список и панели — дети корня, табы — дети списка.
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

	it('табы разметки — дети списка, список и панель — дети корня', () => {
		const { root } = mount(Harness, harness())

		expectOwnParts(root(), 2)
	})

	it('табы из items — дети списка, список и панель — дети корня', () => {
		const { root } = mount(Harness, {
			tabs: { items: ITEMS },
			panels: [{ value: 'a', text: 'Панель A' }],
		})

		expectOwnParts(root(), ITEMS.length)
	})

	/**
	 * Выключенный набор тема гасит корнем, вместе с панелями: `data-disabled`
	 * пишет ядро, а разметка кладёт его на корень, а не на список табов.
	 */
	it('выключенность — data-disabled корня', () => {
		const props = reactiveProps<THarnessProps>({ tabs: { items: ITEMS, disabled: true } })
		const { root } = mount(Harness, props)

		expect(root().dataset.disabled).toBe('true')
		expect(
			find(root(), ':scope > .so-tabs__list', HTMLElement).dataset.disabled,
		).toBeUndefined()

		props.tabs = { items: ITEMS, disabled: false }
		flushSync()

		expect(root().dataset.disabled).toBe('false')
	})
})

/**
 * Панель с `value` пропом: так потребитель переносит её к другому табу. Табы
 * `a` (активен) и `b`, таба `z` нет. Смена `value` меняет у панели таб, и
 * показ обязан идти за новым табом сразу, а не со следующей активацией.
 */
describe('смена value у панели', () => {
	const view = (value: string): THarnessProps => ({
		items: [
			{ value: 'a', text: 'First', active: true },
			{ value: 'b', text: 'Second' },
		],
		panels: [{ value, text: 'Панель' }],
	})

	it('к неактивному табу — панель прячется, его активация показывает её', () => {
		const props = reactiveProps(view('a'))

		mount(Harness, props)

		expect(panels()).toHaveLength(1)

		props.panels = view('b').panels
		flushSync()

		expect(panels()).toHaveLength(0)

		click(tab('Second'))

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('к значению без таба — панель прячется и за прежним табом не идёт', () => {
		const props = reactiveProps(view('a'))

		mount(Harness, props)

		props.panels = view('z').panels
		flushSync()

		expect(panels()).toHaveLength(0)

		// Прежний таб снова активен — панель уже не его
		click(tab('Second'))
		click(tab('First'))

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(panels()).toHaveLength(0)
	})

	it('из значения без таба к активному табу — панель видна и подписана им', () => {
		const props = reactiveProps(view('z'))

		mount(Harness, props)

		expect(panels()).toHaveLength(0)

		props.panels = view('a').panels
		flushSync()

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})
})

describe('связка ARIA в разметке', () => {
	it('aria-controls активного таба указывает на id его панели', () => {
		mount(Harness, harness())

		expect(tab('First').getAttribute('aria-controls')).toBe(panel().id)
	})

	it('aria-labelledby панели указывает на id таба', () => {
		mount(Harness, harness())

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})

	it('панель объявлена как tabpanel', () => {
		mount(Harness, harness())

		expect(panel().getAttribute('role')).toBe('tabpanel')
	})
})

describe('aria-selected', () => {
	it('находится на элементе с role="tab", а не на обёртке', () => {
		mount(Harness, harness())

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(tab('Second').getAttribute('aria-selected')).toBe('false')
		expect(item('First').hasAttribute('aria-selected')).toBe(false)
	})

	it('следует за переключением таба', () => {
		mount(Harness, harness())

		click(tab('Second'))

		expect(tab('First').getAttribute('aria-selected')).toBe('false')
		expect(tab('Second').getAttribute('aria-selected')).toBe('true')
	})

	it('тема читает активность с корня таба: data-selected', () => {
		mount(Harness, harness())

		expect(item('First').dataset.selected).toBe('true')
		expect(item('Second').dataset.selected).toBe('false')
		expect(tab('First').hasAttribute('data-selected')).toBe(false)
	})
})

describe('таб из разметки', () => {
	it('клик потребителя по строке не отменяет активацию', () => {
		const onclick = vi.fn()

		mount(Harness, {
			items: [
				{ value: 'a', text: 'A', active: true },
				{ value: 'b', text: 'B', onclick },
			],
		})

		click(tab('B'))

		expect(onclick).toHaveBeenCalledTimes(1)
		expect(tab('B').getAttribute('aria-selected')).toBe('true')
	})

	it('класс и стиль потребителя — корню таба, остальное — строке', () => {
		mount(Harness, {
			items: [
				{
					value: 'a',
					text: 'A',
					active: true,
					class: 'mine',
					style: 'color: red',
					title: 'Раздел',
				},
			],
		})

		expect(item('A').classList.contains('mine')).toBe(true)
		expect(item('A').style.color).toBe('red')
		expect(tab('A').getAttribute('title')).toBe('Раздел')
		expect(tab('A').classList.contains('mine')).toBe(false)
	})

	it('children таба получает text и active, без него — text', () => {
		mount(Harness, {
			items: [
				{
					value: 'a',
					text: 'A',
					active: true,
					children: scopeText<TRowScope>(
						({ text, active }) => `${text}:${String(active)}`,
					),
				},
				{ value: 'b', text: 'B' },
			],
		})

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])

		click(tab('B'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])
	})

	it('слоты набора из items получают элемент через scope', () => {
		mount(Tabs, {
			items: ITEMS.slice(0, 2),
			leading: markup('<i class="head">до</i>'),
			trailing: markup('<i class="tail">после</i>'),
			item: scopeText<TItemRowScope>(({ item: tabItem }) => `[${tabItem.text}]`),
			'item-leading': scopeMarkup<TItemScope>(
				({ item: tabItem }) => `<u class="lead">${String(tabItem.value)}</u>`,
			),
			'item-trailing': scopeMarkup<TItemScope>(
				({ item: tabItem }) => `<s class="trail">${String(tabItem.value)}</s>`,
			),
		})

		expect(tabs().map((row) => row.querySelector('.so-button__text')?.textContent)).toEqual([
			'[A]',
			'[B]',
		])
		expect([...document.querySelectorAll('.lead')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect([...document.querySelectorAll('.trail')].map((node) => node.textContent)).toEqual([
			'a',
			'b',
		])
		expect(document.querySelector('.so-tabs__list--leading .head')?.textContent).toBe('до')
		expect(document.querySelector('.so-tabs__list--trailing .tail')?.textContent).toBe('после')
	})

	/**
	 * Проброс целиком: scope `item` — scope слота таба плюс сам таб. Слот,
	 * нарисованный набором без проброса, scope таба терял бы: `text` и `active`
	 * держит таб.
	 */
	it('item получает text и active таба, active следует за активацией', () => {
		mount(Tabs, {
			items: ITEMS.slice(0, 2),
			item: scopeText<TItemRowScope>(
				({ item: tabItem, text, active }) =>
					`${String(tabItem.value)}:${text}:${String(active)}`,
			),
		})

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['a:A:true', 'b:B:false'])

		click(tab('b:B:false'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['a:A:false', 'b:B:true'])
	})

	/**
	 * Сниппет непрозрачен: что он нарисовал у таба, тот не видит, — и заданный
	 * набору крестик стоит у каждого таба вместо своей иконки, даже где сниппет
	 * пуст. У React и Vue пустой слот уступает место иконке. Иконку такому табу
	 * рисует сам сниппет — веткой по `item`.
	 */
	it('item-close-icon задан — у каждого таба вместо своей иконки', () => {
		mount(Slots, {})

		expect(
			[...document.querySelectorAll('.so-tabs-item__close')].map((close) =>
				close.querySelector('.probe')
					? 'slot'
					: close.querySelector('svg')
						? 'icon'
						: 'empty',
			),
		).toEqual(['slot', 'empty'])
	})

	it('без leading и trailing обёрток краёв списка нет', () => {
		mount(Tabs, { items: ITEMS })

		expect(document.querySelector('.so-tabs__list--leading')).toBeNull()
		expect(document.querySelector('.so-tabs__list--trailing')).toBeNull()
	})

	/** Атрибуты потребителя набора — на списке табов, а не на корне. */
	it('пропсы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		const { root } = mount(Tabs, { items: ITEMS, title: 'Разделы' })
		const list = find(root(), ':scope > .so-tabs__list', HTMLElement)

		expect(root().hasAttribute('items')).toBe(false)
		expect(list.hasAttribute('items')).toBe(false)
		expect(root().hasAttribute('title')).toBe(false)
		expect(list.getAttribute('title')).toBe('Разделы')
	})
})

describe('кнопка закрытия: разметка', () => {
	const closable = (): THarnessProps => ({
		tabs: { closable: true },
		items: [
			{ value: 'settings', text: 'Настройки', active: true },
			{ value: 'mail', text: 'Почта' },
		],
	})

	it('у таба нет интерактивного потомка', () => {
		mount(Harness, closable())

		expect(tabs()).toHaveLength(2)

		for (const row of tabs()) {
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе таба сразу после строки', () => {
		mount(Harness, closable())

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row.getAttribute('role')).toBe('tab')
		expect(close.tagName).toBe('BUTTON')
		expect(close.classList.contains('so-tabs-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое таба не входит', () => {
		mount(Harness, closable())

		expect(tab('Настройки').textContent?.trim()).toBe('Настройки')
		expect(tab('Настройки').querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})

	it('без closable кнопки нет, в элементе одна строка', () => {
		mount(Harness, { items: [{ value: 'a', text: 'A', active: true }] })

		expect(document.querySelector('.so-tabs-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('слот close-icon подменяет иконку крестика', () => {
		mount(Harness, {
			tabs: { closable: true },
			items: [
				{
					value: 'a',
					text: 'A',
					active: true,
					'close-icon': markup('<b class="custom">×</b>'),
				},
			],
		})

		expect(closeOf('A').querySelector('.custom')).not.toBeNull()
		expect(closeOf('A').querySelector('svg')).toBeNull()
	})
})

describe('кнопка закрытия: поведение', () => {
	it('клик закрывает таб и не активирует его', async () => {
		mount(Tabs, { closable: true, items: ITEMS })

		// Крестик закрывает по клику своего TActionPlugin — он слушает узел с `ready`
		await nextFrame()

		click(closeOf('B'))

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
	it('клик по крестику не вызывает onActionPress ни у таба, ни у набора', async () => {
		const tabPress = vi.fn()
		const setPress = vi.fn()

		mount(Harness, {
			tabs: { closable: true, onActionPress: setPress },
			items: [
				{ value: 'a', text: 'A', active: true },
				{ value: 'b', text: 'B', onActionPress: tabPress },
			],
		})
		await nextFrame()

		click(closeOf('B'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A'])
		expect(tabPress).not.toHaveBeenCalled()
		expect(setPress).not.toHaveBeenCalled()

		// Клик по строке до корней доходит: слушатели на месте
		click(tab('A'))

		expect(setPress).toHaveBeenCalledTimes(1)
	})

	it('размер кнопки — размер таба: от него считается кегль иконки', () => {
		mount(Harness, {
			tabs: { closable: true, size: 'lg' },
			items: [{ value: 'a', text: 'A', active: true }],
		})

		expect(closeOf('A').classList.contains('so-button--size-lg')).toBe(true)
	})

	/**
	 * `closable` таба трёхзначен: `undefined` значит «как у набора». Снятый
	 * проп обязан вернуть таб к значению набора.
	 */
	it('false у таба прячет кнопку, снятие возвращает её от набора', () => {
		const view = (own?: boolean): THarnessProps => ({
			tabs: { closable: true },
			items: [{ value: 'a', text: 'A', active: true, closable: own }],
		})
		const props = reactiveProps(view(false))

		mount(Harness, props)

		expect(item('A').querySelector('.so-tabs-item__close')).toBeNull()

		props.items = view(undefined).items
		flushSync()

		expect(item('A').querySelector('.so-tabs-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный таб не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного таба кнопки закрытия нет', () => {
	/** «B» выключен со старта, «C» — `tabOff`, весь набор — `setOff`. */
	const view = ({ tabOff = false, setOff = false } = {}): THarnessProps => ({
		tabs: { closable: true, disabled: setOff },
		items: [
			{ value: 'a', text: 'A', active: true },
			{ value: 'b', text: 'B', disabled: true },
			{ value: 'c', text: 'C', disabled: tabOff },
		],
	})

	/** Табы, у которых есть кнопка закрытия, — по тексту строки. */
	const withClose = () =>
		['A', 'B', 'C'].filter((text) => item(text).querySelector('.so-tabs-item__close'))

	it('выключенный со старта', () => {
		mount(Harness, view())

		expect(withClose()).toEqual(['A', 'C'])
		expect(item('B').children).toHaveLength(1)
	})

	it('выключили позже — кнопка пропала, включили — вернулась', () => {
		const props = reactiveProps(view())

		mount(Harness, props)

		Object.assign(props, view({ tabOff: true }))
		flushSync()

		expect(withClose()).toEqual(['A'])

		Object.assign(props, view({ tabOff: false }))
		flushSync()

		expect(withClose()).toEqual(['A', 'C'])
	})

	it('выключили набор — кнопок нет ни у одного таба, включили — вернулись', () => {
		const props = reactiveProps(view())

		mount(Harness, props)

		Object.assign(props, view({ setOff: true }))
		flushSync()

		expect(withClose()).toEqual([])

		Object.assign(props, view({ setOff: false }))
		flushSync()

		// `disabled` набора распространяется на всех: включение включает и «B»
		expect(withClose()).toEqual(['A', 'B', 'C'])
	})
})

describe('клавиатура', () => {
	const abc = (props: TabsProps = {}): THarnessProps => ({
		tabs: props,
		items: [
			{ value: 'a', text: 'A' },
			{ value: 'b', text: 'B', active: true },
			{ value: 'c', text: 'C' },
		],
	})

	it('tabindex="0" ровно у одного таба — у активного', () => {
		mount(Harness, abc())

		const stops = document.querySelectorAll('[role="tab"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(tab('B'))
		expect(tab('A').getAttribute('tabindex')).toBe('-1')
		expect(tab('C').getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка закрытия — не остановка Tab', () => {
		mount(Harness, abc({ closable: true }))

		const closes = [...document.querySelectorAll('.so-tabs-item__close')]

		expect(closes).toHaveLength(3)
		expect(closes.every((close) => close.getAttribute('tabindex') === '-1')).toBe(true)
	})

	it('tablist объявляет ориентацию и имя из aria_label', () => {
		mount(Harness, abc({ orientation: 'vertical', aria_label: 'Разделы' }))

		const list = document.querySelector('.so-tabs__list')

		expect(list?.getAttribute('role')).toBe('tablist')
		expect(list?.getAttribute('aria-orientation')).toBe('vertical')
		expect(list?.getAttribute('aria-label')).toBe('Разделы')
	})

	it('корень ARIA списка не получает — рядом со списком лежат панели', () => {
		const { root } = mount(Harness, abc({ aria_label: 'Разделы' }))

		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-label')).toBe(false)
	})

	it('→ переносит фокус на строку следующего таба и активирует его', async () => {
		mount(Harness, abc())

		// Клавиатура набора слушает корень с `element:ready` — через кадр
		await nextFrame()

		focus(tab('B'))
		press(tab('B'), 'ArrowRight')

		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
		expect(tab('B').getAttribute('aria-selected')).toBe('false')
		expect(tab('C').getAttribute('tabindex')).toBe('0')
		expect(tab('B').getAttribute('tabindex')).toBe('-1')
	})

	it('Delete закрывает таб, фокус остаётся в списке — на соседе', async () => {
		mount(Tabs, {
			closable: true,
			items: [
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B', _: { active: true } },
				{ value: 'c', text: 'C' },
			],
		})
		await nextFrame()

		focus(tab('B'))
		press(tab('B'), 'Delete')

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A', 'C'])
		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
	})
})

describe('типы', () => {
	it('Tabs.Item — это TabsItem, Tabs.Content — TabsContent', () => {
		expect(Tabs.Item).toBe(TabsItem)
		expect(Tabs.Content).toBe(TabsContent)
		expectTypeOf(Tabs.Item).toEqualTypeOf<typeof TabsItem>()
		expectTypeOf(Tabs.Content).toEqualTypeOf<typeof TabsContent>()
	})

	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('слоты несут scope из дескрипторов', () => {
		expectTypeOf<Snippet<[TItemRowScope]>>().toExtend<NonNullable<TabsProps['item']>>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<NonNullable<TabsProps['item-leading']>>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<NonNullable<TabsProps['item-close-icon']>>()
		expectTypeOf<Snippet<[TRowScope]>>().toExtend<NonNullable<TabsItemProps['children']>>()
		expectTypeOf<TabsProps['content']>().toEqualTypeOf<Snippet | undefined>()
		expectTypeOf<TabsContentProps['children']>().toEqualTypeOf<Snippet | undefined>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<TabsProps>().toHaveProperty('onItemActivated')
		expectTypeOf<TabsProps>().toHaveProperty('onItemClose')
		expectTypeOf<TabsProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<TabsItemProps>().toHaveProperty('onChangeActive')
		expectTypeOf<TabsItemProps>().toHaveProperty('onChangeOrder')
		expectTypeOf<TabsItemProps>().toHaveProperty('onChangeClosable')
		expectTypeOf<TabsContentProps>().toHaveProperty('onChangeActive')
	})
})
