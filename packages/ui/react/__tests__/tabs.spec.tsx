/**
 * Tabs в React — второй потребитель коллекций после ListBox.
 *
 * Сценарии — те же, что у Vue (`tabs-content`, `tabs-close`, `tabs-keyboard`):
 * панель по активному табу и ARIA-связка «таб ↔ панель», кнопка закрытия,
 * клавиатура по APG Tabs. Движок, расширения и плагины перенесены без правок.
 *
 * Своё у React — момент входа. Таб разметки входит в коллекцию при коммите, и
 * панель находит его там же: связка панели (`TTabsContentBindingExtension`)
 * ищет таб в сборке и ещё раз на `attach`, а на движок подписывается только
 * на `attach` — сборка React идёт на рендере. Пересборку, сервер и гидратацию
 * проверяет `tabs-accordion-elevator.spec.tsx`.
 *
 * И крестик. Во Vue он гасит всплытие (`@click.stop`); синтетический
 * `stopPropagation` React нативные слушатели `TActionPlugin` на корнях таба и
 * набора не остановит — к нему событие их уже прошло. Поэтому крестик
 * закрывает по нативному клику своего плагина (`onActionClick`) и гасит
 * всплытие у нативного события.
 */

import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import { act, type ReactNode } from 'react'
import type { ITabsItem } from '@soldy-ui/core'
import {
	Tabs,
	TabsContent,
	TabsItem,
	type TabsContentProps,
	type TabsItemProps,
	type TabsProps,
} from '@soldy-ui/react'
import { find, mount, nextFrame } from './mount'

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
	const found = [...document.querySelectorAll('.s-tabs-item')].find(
		(candidate) => candidate.querySelector('[role="tab"]')?.textContent?.trim() === text,
	)

	if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

	return found
}

/** Кнопка закрытия таба; нет её — тест падает здесь. */
function closeOf(text: string): HTMLElement {
	const close = item(text).querySelector('.s-tabs-item__close')

	if (!(close instanceof HTMLElement)) throw new Error(`у таба «${text}» нет кнопки закрытия`)

	return close
}

const panels = () => [...document.querySelectorAll('.s-tabs__panel')]

/** Единственная показанная панель; их не одна — тест падает здесь. */
function panel(): HTMLElement {
	const shown = panels()

	if (shown.length !== 1 || !(shown[0] instanceof HTMLElement)) {
		throw new Error(`показанных панелей ${shown.length}, а не одна`)
	}

	return shown[0]
}

function click(element: HTMLElement): void {
	act(() => element.click())
}

/** Фокус на узел: `TActionPlugin` пишет его в `focused` таба — это обновление состояния. */
function focus(element: HTMLElement): void {
	act(() => element.focus())
}

/** Клавиша на узле — как её шлёт браузер: всплывает и отменяется. */
function press(target: Element, key: string): void {
	act(() => {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
	})
}

/** Табы и панели из разметки — как `TabsContent.test.vue` у Vue. */
function Harness(props: TabsProps): ReactNode {
	return (
		<Tabs
			{...props}
			content={
				<>
					<Tabs.Content value="a">Панель A</Tabs.Content>
					<Tabs.Content value="b">Панель B</Tabs.Content>
				</>
			}
		>
			<Tabs.Item value="a" text="First" active />
			<Tabs.Item value="b" text="Second" />
		</Tabs>
	)
}

const ITEMS = [
	{ value: 'a', text: 'A', _: { active: true } },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

describe('показ панели по активному табу', () => {
	it('видна только панель активного таба', () => {
		mount(<Harness />)

		expect(panel().textContent).toBe('Панель A')
	})

	it('переключение таба переключает панель', () => {
		mount(<Harness />)

		click(tab('Second'))

		expect(panel().textContent).toBe('Панель B')
	})

	it('панель лежит вне списка табов', () => {
		mount(<Harness />)

		// Попади она в `children`, оказалась бы внутри [role=tablist]
		expect(document.querySelector('[role="tablist"] .s-tabs__panel')).toBeNull()
		expect(panels()).toHaveLength(1)
	})

	it('панель вне Tabs пуста: таба, по которому её показывать, нет', () => {
		const { container } = mount(<Tabs.Content value="a">Панель A</Tabs.Content>)

		expect(container.innerHTML).toBe('')
	})

	/**
	 * Таб, пришедший после панели, панель находит, когда он входит в
	 * коллекцию: на `item:added` она подписана со своего `attach`.
	 */
	it('таб, вошедший после панели, панель находит при его коммите', () => {
		const view = (withB: boolean) => (
			<Tabs
				content={
					<>
						<Tabs.Content value="a">Панель A</Tabs.Content>
						<Tabs.Content value="b">Панель B</Tabs.Content>
					</>
				}
			>
				<Tabs.Item value="a" text="First" active={!withB} />
				{withB ? <Tabs.Item value="b" text="Second" active /> : null}
			</Tabs>
		)
		const { render } = mount(view(false))

		expect(panel().textContent).toBe('Панель A')

		render(view(true))

		expect(panel().textContent).toBe('Панель B')
		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('панель внутри [role=tablist] — предупреждение TTabsContentWarnPlugin', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		mount(
			<Tabs>
				<Tabs.Item value="a" text="First" active />
				<Tabs.Content value="a">Панель A</Tabs.Content>
			</Tabs>,
		)

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

		mount(<Harness />)
		await nextFrame()

		expect(warn).not.toHaveBeenCalled()
	})
})

/**
 * Тема рисует вид набора от его корня дочерними комбинаторами — свой список,
 * его табы и свою панель (`themes/oren/AGENTS.md`, «Tabs: вид — от своего
 * списка»): правило для потомков досталось бы и табам в панели. Держится это
 * на разметке: список и панели — дети корня (`Elevate` своего узла не даёт),
 * табы — дети списка.
 */
describe('разметка, на которую опирается тема', () => {
	/** Табы набора — дети списка, список и показанная панель — дети корня. */
	function expectOwnParts(root: HTMLElement, count: number): void {
		const list = find(root, ':scope > .s-tabs__list', HTMLElement)
		const tabItems = [...document.querySelectorAll('.s-tabs-item')]

		expect(panel().parentElement).toBe(root)
		expect(tabItems).toHaveLength(count)

		for (const tabItem of tabItems) expect(tabItem.parentElement).toBe(list)
	}

	it('табы разметки — дети списка, список и панель — дети корня', () => {
		const { root } = mount(<Harness />)

		expectOwnParts(root(), 2)
	})

	it('табы из items — дети списка, список и панель — дети корня', () => {
		const { root } = mount(
			<Tabs items={ITEMS} content={<Tabs.Content value="a">Панель A</Tabs.Content>} />,
		)

		expectOwnParts(root(), ITEMS.length)
	})
})

/**
 * Панель с `value` пропом: так потребитель переносит её к другому табу. Табы
 * `a` (активен) и `b`, таба `z` нет. Смена `value` меняет у панели таб, и
 * показ обязан идти за новым табом сразу, а не со следующей активацией.
 */
describe('смена value у панели', () => {
	const view = (value: string) => (
		<Tabs content={<Tabs.Content value={value}>Панель</Tabs.Content>}>
			<Tabs.Item value="a" text="First" active />
			<Tabs.Item value="b" text="Second" />
		</Tabs>
	)

	it('к неактивному табу — панель прячется, его активация показывает её', () => {
		const { render } = mount(view('a'))

		expect(panels()).toHaveLength(1)

		render(view('b'))

		expect(panels()).toHaveLength(0)

		click(tab('Second'))

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('Second').id)
	})

	it('к значению без таба — панель прячется и за прежним табом не идёт', () => {
		const { render } = mount(view('a'))

		render(view('z'))

		expect(panels()).toHaveLength(0)

		// Прежний таб снова активен — панель уже не его
		click(tab('Second'))
		click(tab('First'))

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(panels()).toHaveLength(0)
	})

	it('из значения без таба к активному табу — панель видна и подписана им', () => {
		const { render } = mount(view('z'))

		expect(panels()).toHaveLength(0)

		render(view('a'))

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})
})

describe('связка ARIA в разметке', () => {
	it('aria-controls активного таба указывает на id его панели', () => {
		mount(<Harness />)

		expect(tab('First').getAttribute('aria-controls')).toBe(panel().id)
	})

	it('aria-labelledby панели указывает на id таба', () => {
		mount(<Harness />)

		expect(panel().getAttribute('aria-labelledby')).toBe(tab('First').id)
	})

	it('панель объявлена как tabpanel', () => {
		mount(<Harness />)

		expect(panel().getAttribute('role')).toBe('tabpanel')
	})
})

describe('aria-selected', () => {
	it('находится на элементе с role="tab", а не на обёртке', () => {
		mount(<Harness />)

		expect(tab('First').getAttribute('aria-selected')).toBe('true')
		expect(tab('Second').getAttribute('aria-selected')).toBe('false')
		expect(item('First').hasAttribute('aria-selected')).toBe(false)
	})

	it('следует за переключением таба', () => {
		mount(<Harness />)

		click(tab('Second'))

		expect(tab('First').getAttribute('aria-selected')).toBe('false')
		expect(tab('Second').getAttribute('aria-selected')).toBe('true')
	})

	it('тема читает активность с корня таба: data-selected', () => {
		mount(<Harness />)

		expect(item('First').dataset.selected).toBe('true')
		expect(item('Second').dataset.selected).toBe('false')
		expect(tab('First').hasAttribute('data-selected')).toBe(false)
	})
})

describe('таб из разметки', () => {
	it('клик потребителя по строке не отменяет активацию', () => {
		const onClick = vi.fn()

		mount(
			<Tabs>
				<Tabs.Item value="a" text="A" active />
				<Tabs.Item value="b" text="B" onClick={onClick} />
			</Tabs>,
		)

		click(tab('B'))

		expect(onClick).toHaveBeenCalledTimes(1)
		expect(tab('B').getAttribute('aria-selected')).toBe('true')
	})

	it('класс и стиль потребителя — корню таба, остальное — строке', () => {
		mount(
			<Tabs>
				<Tabs.Item
					value="a"
					text="A"
					active
					className="mine"
					style={{ color: 'red' }}
					title="Раздел"
				/>
			</Tabs>,
		)

		expect(item('A').classList.contains('mine')).toBe(true)
		expect(item('A').style.color).toBe('red')
		expect(tab('A').getAttribute('title')).toBe('Раздел')
		expect(tab('A').classList.contains('mine')).toBe(false)
	})

	it('children таба получает text и active, без него — text', () => {
		mount(
			<Tabs>
				<Tabs.Item value="a" text="A" active>
					{({ text, active }) => `${text}:${String(active)}`}
				</Tabs.Item>
				<Tabs.Item value="b" text="B" />
			</Tabs>,
		)

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A:true', 'B'])

		click(tab('B'))

		expect(tabs().map((row) => row.textContent?.trim())).toEqual(['A:false', 'B'])
	})

	it('слоты набора из items получают элемент через scope', () => {
		mount(
			<Tabs
				items={ITEMS.slice(0, 2)}
				leading={<i className="head">до</i>}
				trailing={<i className="tail">после</i>}
				item={({ item: tabItem }) => `[${tabItem.text}]`}
				item-leading={({ item: tabItem }) => (
					<u className="lead">{String(tabItem.value)}</u>
				)}
				item-trailing={({ item: tabItem }) => (
					<s className="trail">{String(tabItem.value)}</s>
				)}
			/>,
		)

		expect(tabs().map((row) => row.querySelector('.s-button__text')?.textContent)).toEqual([
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
		expect(document.querySelector('.s-tabs__list--leading .head')?.textContent).toBe('до')
		expect(document.querySelector('.s-tabs__list--trailing .tail')?.textContent).toBe('после')
	})

	it('без leading и trailing обёрток краёв списка нет', () => {
		mount(<Tabs items={ITEMS} />)

		expect(document.querySelector('.s-tabs__list--leading')).toBeNull()
		expect(document.querySelector('.s-tabs__list--trailing')).toBeNull()
	})

	it('пропсы фасада — не атрибуты, атрибуты потребителя — атрибуты', () => {
		const { root } = mount(<Tabs items={ITEMS} title="Разделы" />)

		expect(root().hasAttribute('items')).toBe(false)
		expect(root().getAttribute('title')).toBe('Разделы')
	})
})

describe('кнопка закрытия: разметка', () => {
	const closable = () => (
		<Tabs closable>
			<Tabs.Item value="settings" text="Настройки" active />
			<Tabs.Item value="mail" text="Почта" />
		</Tabs>
	)

	it('у таба нет интерактивного потомка', () => {
		mount(closable())

		expect(tabs()).toHaveLength(2)

		for (const row of tabs()) {
			expect(
				row.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе таба сразу после строки', () => {
		mount(closable())

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row.getAttribute('role')).toBe('tab')
		expect(close.tagName).toBe('BUTTON')
		expect(close.classList.contains('s-tabs-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое таба не входит', () => {
		mount(closable())

		expect(tab('Настройки').textContent?.trim()).toBe('Настройки')
		expect(tab('Настройки').querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})

	it('без closable кнопки нет, в элементе одна строка', () => {
		mount(
			<Tabs>
				<Tabs.Item value="a" text="A" active />
			</Tabs>,
		)

		expect(document.querySelector('.s-tabs-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})

	it('слот close-icon подменяет иконку крестика', () => {
		mount(
			<Tabs closable>
				<Tabs.Item value="a" text="A" active close-icon={<b className="custom">×</b>} />
			</Tabs>,
		)

		expect(closeOf('A').querySelector('.custom')).not.toBeNull()
		expect(closeOf('A').querySelector('svg')).toBeNull()
	})
})

describe('кнопка закрытия: поведение', () => {
	it('клик закрывает таб и не активирует его', async () => {
		mount(<Tabs closable items={ITEMS} />)

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

		mount(
			<Tabs closable onActionPress={setPress}>
				<Tabs.Item value="a" text="A" active />
				<Tabs.Item value="b" text="B" onActionPress={tabPress} />
			</Tabs>,
		)
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
		mount(
			<Tabs closable size="lg">
				<Tabs.Item value="a" text="A" active />
			</Tabs>,
		)

		expect(closeOf('A').classList.contains('s-button--size-lg')).toBe(true)
	})

	/**
	 * `closable` таба трёхзначен: `undefined` значит «как у набора». Снятый
	 * проп обязан вернуть таб к значению набора.
	 */
	it('false у таба прячет кнопку, снятие возвращает её от набора', () => {
		const view = (own?: boolean) => (
			<Tabs closable>
				<Tabs.Item value="a" text="A" active closable={own} />
			</Tabs>
		)
		const { render } = mount(view(false))

		expect(item('A').querySelector('.s-tabs-item__close')).toBeNull()

		render(view(undefined))

		expect(item('A').querySelector('.s-tabs-item__close')).not.toBeNull()
	})
})

/**
 * Выключенный таб не закрывается, и кнопки у него нет — с какого бы пути он
 * ни пришёл к «выключен».
 */
describe('у выключенного таба кнопки закрытия нет', () => {
	/** «B» выключен со старта, «C» — пропом `tabOff`, весь набор — пропом `setOff`. */
	const view = ({ tabOff = false, setOff = false } = {}) => (
		<Tabs closable disabled={setOff}>
			<Tabs.Item value="a" text="A" active />
			<Tabs.Item value="b" text="B" disabled />
			<Tabs.Item value="c" text="C" disabled={tabOff} />
		</Tabs>
	)

	/** Табы, у которых есть кнопка закрытия, — по тексту строки. */
	const withClose = () =>
		['A', 'B', 'C'].filter((text) => item(text).querySelector('.s-tabs-item__close'))

	it('выключенный со старта', () => {
		mount(view())

		expect(withClose()).toEqual(['A', 'C'])
		expect(item('B').children).toHaveLength(1)
	})

	it('выключили позже — кнопка пропала, включили — вернулась', () => {
		const { render } = mount(view())

		render(view({ tabOff: true }))

		expect(withClose()).toEqual(['A'])

		render(view({ tabOff: false }))

		expect(withClose()).toEqual(['A', 'C'])
	})

	it('выключили набор — кнопок нет ни у одного таба, включили — вернулись', () => {
		const { render } = mount(view())

		render(view({ setOff: true }))

		expect(withClose()).toEqual([])

		render(view({ setOff: false }))

		// `disabled` набора распространяется на всех: включение включает и «B»
		expect(withClose()).toEqual(['A', 'B', 'C'])
	})
})

describe('клавиатура', () => {
	const abc = (props: TabsProps = {}) => (
		<Tabs {...props}>
			<Tabs.Item value="a" text="A" />
			<Tabs.Item value="b" text="B" active />
			<Tabs.Item value="c" text="C" />
		</Tabs>
	)

	it('tabindex="0" ровно у одного таба — у активного', () => {
		mount(abc())

		const stops = document.querySelectorAll('[role="tab"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(tab('B'))
		expect(tab('A').getAttribute('tabindex')).toBe('-1')
		expect(tab('C').getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка закрытия — не остановка Tab', () => {
		mount(abc({ closable: true }))

		const closes = [...document.querySelectorAll('.s-tabs-item__close')]

		expect(closes).toHaveLength(3)
		expect(closes.every((close) => close.getAttribute('tabindex') === '-1')).toBe(true)
	})

	it('tablist объявляет ориентацию и имя из aria_label', () => {
		mount(abc({ orientation: 'vertical', aria_label: 'Разделы' }))

		const list = document.querySelector('.s-tabs__list')

		expect(list?.getAttribute('role')).toBe('tablist')
		expect(list?.getAttribute('aria-orientation')).toBe('vertical')
		expect(list?.getAttribute('aria-label')).toBe('Разделы')
	})

	it('корень ARIA списка не получает — рядом со списком лежат панели', () => {
		const { root } = mount(abc({ aria_label: 'Разделы' }))

		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-label')).toBe(false)
	})

	it('→ переносит фокус на строку следующего таба и активирует его', async () => {
		mount(abc())

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
		mount(
			<Tabs
				closable
				items={[
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', _: { active: true } },
					{ value: 'c', text: 'C' },
				]}
			/>,
		)
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

	it('слоты несут scope из дескрипторов', () => {
		type TItemSlot = NonNullable<TabsProps['item']>
		type TItemLeading = NonNullable<TabsProps['item-leading']>
		type TChildren = NonNullable<TabsItemProps['children']>

		expectTypeOf<(scope: { item: ITabsItem }) => ReactNode>().toExtend<TItemSlot>()
		expectTypeOf<(scope: { item: ITabsItem }) => ReactNode>().toExtend<TItemLeading>()
		expectTypeOf<
			(scope: { text: string; active: boolean }) => ReactNode
		>().toExtend<TChildren>()
		expectTypeOf<TabsProps['content']>().toEqualTypeOf<ReactNode>()
		expectTypeOf<TabsContentProps['children']>().toEqualTypeOf<ReactNode>()
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
