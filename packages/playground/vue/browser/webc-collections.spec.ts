/**
 * Коллекции Web Components в настоящем браузере: `<div is="so-tabs">`,
 * `<div is="so-accordion">`, `<div is="so-radio-group">`,
 * `<div is="so-list-box">`, `<div is="so-tags">`, `<div is="so-select">` и
 * `<span is="so-menu">`.
 *
 * Теме корень элемента коллекции Web Components — то же, что корень остальных
 * адаптеров: строка таба и его кнопка закрытия, заголовок секции и её стрелка,
 * радио и его кольцо, строка элемента списка — кнопка на `div` — и его отметка,
 * пилюля тега со строкой и крестиком, поле Select с обёртками, стрелкой и
 * тегами каждого размера стоят так же, как у Vue. Клавиатура — то, чего jsdom
 * не выполняет: стрелки по табам, тегам, списку и опциям Select ведёт плагин
 * владельца, а по радио — сам браузер, по общему `name` группы. Открытые
 * панели меню и подменю с частями стоят у триггера и у строки, а панель Select
 * с опциями — у поля так же, как у Vue (замер `panel-boxes.ts`), а стрелки
 * ведут фокус по пунктам и между уровнями — и в меню, переставленном одной
 * операцией.
 * Разметку и наборы ядра сторожат `ui/webc/__tests__/tabs.spec.ts`,
 * `accordion.spec.ts`, `radio-group.spec.ts`, `list-box.spec.ts`,
 * `tags.spec.ts`, `select.spec.ts` и `menu.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'
import {
	Accordion,
	AccordionItem,
	Button,
	ListBox,
	ListBoxItem,
	Menu,
	RadioGroup,
	RadioGroupItem,
	Select,
	SelectItem,
	Tabs,
	TabsItem,
	Tags,
	TagsItem,
} from '@soldy-ui/vue'
import { TRadioGroupElement, type TRadioGroupElementProps } from '@soldy-ui/webc'
import { measure, type TBox } from './panel-boxes'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел разметки Web Components теста — снимается после каждого. */
let stage: HTMLElement | null = null

/**
 * Разметка на странице, слушатели плагинов — на элементах. Плагины вешают их
 * по `ready` узла, а `TElementPlugin` объявляет узел через кадр.
 */
async function show(html: string): Promise<HTMLElement> {
	const node = document.createElement('div')

	node.innerHTML = html
	document.body.appendChild(node)
	stage = node

	await nextFrame()
	await nextFrame()

	return node
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	stage?.remove()
	stage = null
	cleanup()
})

/** Узел по селектору; нет его или он не того вида — тест падает здесь. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Узлы по селектору — HTML-элементы. */
const all = (root: ParentNode, selector: string): HTMLElement[] =>
	[...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

function isGroup(node: Element | null): node is TRadioGroupElementProps {
	return node instanceof TRadioGroupElement
}

/** Размер узла на странице. */
function size(node: Element) {
	const { width, height } = node.getBoundingClientRect()

	return { width, height }
}

/**
 * Коллекция Web Components и коллекция Vue одного размера стоят рядом — в
 * одинаковых блоках одной ширины. Тема видит у них одни классы и одну разметку
 * внутри корня, и части получаются одних размеров.
 */
describe.each(COMPONENT_SIZES)('размер %s — как у Vue', (scale) => {
	/** Блок одной ширины для пары коллекций. */
	const BOX = 'width: 480px'

	async function pair(vue: () => ReturnType<typeof h>, html: string): Promise<HTMLElement> {
		render(defineComponent({ render: () => h('div', { class: 'vue', style: BOX }, [vue()]) }))
		await nextTick()

		return show(`<div class="webc" style="${BOX}">${html}</div>`)
	}

	/** Части одного селектора у обеих коллекций — по порядку и одних размеров. */
	function expectSameParts(root: HTMLElement, part: string): void {
		const vue = all(document, `.vue ${part}`).map(size)

		expect(vue.length, part).toBeGreaterThan(0)
		expect(
			vue.every(({ width }) => width > 0),
			part,
		).toBe(true)
		expect(all(root, `.webc ${part}`).map(size), part).toEqual(vue)
	}

	it('Tabs: список, табы, строки и кнопки закрытия', async () => {
		const root = await pair(
			() =>
				h(Tabs, { size: scale, closable: true }, () => [
					h(TabsItem, { value: 'a', text: 'Первый', active: true }),
					h(TabsItem, { value: 'b', text: 'Второй' }),
				]),
			`<div is="so-tabs" size="${scale}" closable>
				<div is="so-tabs-item" value="a" text="Первый" active></div>
				<div is="so-tabs-item" value="b" text="Второй"></div>
			</div>`,
		)

		for (const part of [
			'.so-tabs__list',
			'.so-tabs-item',
			'.so-tabs-item [role="tab"]',
			'.so-tabs-item__close',
		]) {
			expectSameParts(root, part)
		}
	})

	it('Accordion: секции, заголовки и стрелки', async () => {
		const root = await pair(
			() =>
				h(Accordion, { size: scale }, () => [
					h(AccordionItem, { value: 'a', text: 'Первый', selected: true }, () => 'A'),
					h(
						AccordionItem,
						{ value: 'b', text: 'Второй', arrowPlacement: 'end' },
						() => 'B',
					),
				]),
			`<div is="so-accordion" size="${scale}">
				<div is="so-accordion-item" value="a" text="Первый" selected>A</div>
				<div is="so-accordion-item" value="b" text="Второй" arrow-placement="end">B</div>
			</div>`,
		)

		for (const part of [
			'.so-accordion-item',
			'.so-accordion-item__header',
			'.so-accordion-item__arrow',
		]) {
			expectSameParts(root, part)
		}
	})

	it('RadioGroup: радио, кольцо и подпись', async () => {
		const root = await pair(
			() =>
				h(RadioGroup, { size: scale, value: 'a' }, () => [
					h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
					h(RadioGroupItem, { value: 'b' }, () => 'Второй'),
				]),
			`<div is="so-radio-group" size="${scale}" value="a">
				<label is="so-radio-group-item" value="a">Первый</label>
				<label is="so-radio-group-item" value="b">Второй</label>
			</div>`,
		)

		for (const part of [
			'.so-radio-group-item',
			'.so-radio-group-item__control',
			'.so-radio-group-item__text',
		]) {
			expectSameParts(root, part)
		}
	})

	/** Отметка стоит у обоих пунктов, иконка в ней — у выбранного. */
	it('ListBox: список, элементы, строки и отметка', async () => {
		const root = await pair(
			() =>
				h(ListBox, { size: scale, indicator: 'start', value: 'a' }, () => [
					h(ListBoxItem, { value: 'a', text: 'Первый' }),
					h(ListBoxItem, { value: 'b', text: 'Второй' }),
				]),
			`<div is="so-list-box" size="${scale}" indicator="start" value="a">
				<div is="so-list-box-item" value="a" text="Первый"></div>
				<div is="so-list-box-item" value="b" text="Второй"></div>
			</div>`,
		)

		for (const part of [
			'.so-list-box',
			'.so-list-box-item',
			'.so-list-box-item .so-button',
			'.so-list-box-item__indicator',
		]) {
			expectSameParts(root, part)
		}

		// Иконка отметки у Vue — `<svg>` роли, у Web Components — `<span>` с
		// рисунком внутри: элементы разные, а коробка одна
		const icon = (box: string) =>
			size(find(document, `${box} .so-list-box-item__indicator .so-icon`, Element))

		expect(icon('.webc')).toEqual(icon('.vue'))
	})

	/** Пилюля тега — корень со строкой и крестиком рядом; выбранный — с выбором. */
	it('Tags: набор, теги, строки и крестики', async () => {
		const root = await pair(
			() =>
				h(Tags, { size: scale, closable: true, mode: 'single', value: 'a' }, () => [
					h(TagsItem, { value: 'a', text: 'Первый' }),
					h(TagsItem, { value: 'b', text: 'Второй' }),
				]),
			`<div is="so-tags" size="${scale}" closable mode="single" value="a">
				<div is="so-tags-item" value="a" text="Первый"></div>
				<div is="so-tags-item" value="b" text="Второй"></div>
			</div>`,
		)

		for (const part of ['.so-tags', '.so-tags-item', '.so-tags-item > .so-button']) {
			expectSameParts(root, part)
		}

		// Иконка крестика у Vue — `<svg>` роли, у Web Components — `<span>` с
		// рисунком внутри: элементы разные, а коробка одна
		const icons = (box: string) =>
			[...document.querySelectorAll(`${box} .so-tags-item__close .so-icon`)].map(size)

		expect(icons('.webc')).toEqual(icons('.vue'))
	})

	/**
	 * Поле Select — деталь Input: обёртка `leading` стоит и в `single` (её
	 * держит метка), за полем — обёртка с кнопкой очистки и стрелкой.
	 */
	it('Select: поле, обёртки по его сторонам, очистка и стрелка', async () => {
		const root = await pair(
			() =>
				h(Select, { size: scale, value: 'a', clearable: true }, () => [
					h(SelectItem, { value: 'a', text: 'Первый' }),
					h(SelectItem, { value: 'b', text: 'Второй' }),
				]),
			`<div is="so-select" size="${scale}" value="a" clearable>
				<div is="so-select-item" value="a" text="Первый"></div>
				<div is="so-select-item" value="b" text="Второй"></div>
			</div>`,
		)

		for (const part of [
			'.so-select',
			'.so-select__field',
			'.so-input__leading',
			'.so-select__field input',
			'.so-input__trailing',
			'.so-input__clear',
			'.so-select__arrow',
		]) {
			expectSameParts(root, part)
		}

		const arrow = (box: string) =>
			size(find(document, `${box} .so-select__arrow .so-icon`, Element))

		expect(arrow('.webc')).toEqual(arrow('.vue'))
	})

	/** Теги в поле — деталь Tags перед полем ввода, как встроенный `Tags` у Vue. */
	it('Select multiple: теги в поле стоят так же', async () => {
		const root = await pair(
			() =>
				h(Select, { size: scale, mode: 'multiple', value: ['a', 'b'] }, () => [
					h(SelectItem, { value: 'a', text: 'Первый' }),
					h(SelectItem, { value: 'b', text: 'Второй' }),
				]),
			`<div is="so-select" size="${scale}" mode="multiple">
				<div is="so-select-item" value="a" text="Первый" selected></div>
				<div is="so-select-item" value="b" text="Второй" selected></div>
			</div>`,
		)

		for (const part of [
			'.so-select__field',
			'.so-input__leading',
			'.so-select__tags',
			'.so-select__tags .so-tags-item',
			'.so-select__tags .so-tags-item > .so-button',
			'.so-select__field input',
		]) {
			expectSameParts(root, part)
		}
	})
})

describe('клавиатура', () => {
	/** Весь список — одна остановка Tab, стрелки ведут фокус и активность. */
	it('Tabs: → переносит фокус на следующий таб и активирует его', async () => {
		const root = await show(`<div is="so-tabs">
			<div is="so-tabs-item" value="a" text="A" active></div>
			<div is="so-tabs-item" value="b" text="B"></div>
			<div is="so-tabs-item" value="c" text="C"></div>
			<div is="so-tabs-content" slot="content" value="a">Панель A</div>
			<div is="so-tabs-content" slot="content" value="b">Панель B</div>
		</div>`)
		const rows = all(root, '[role="tab"]')

		rows[0]?.focus()
		await userEvent.keyboard('{ArrowRight}')
		await nextFrame()

		expect(document.activeElement).toBe(rows[1])
		expect(rows[1]?.getAttribute('aria-selected')).toBe('true')
		expect(rows.map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])

		const shown = all(root, '.so-tabs__panel').filter((panel) => panel.style.display !== 'none')

		expect(shown.map((panel) => panel.textContent)).toEqual(['Панель B'])
	})

	/**
	 * Группу для браузера собирает общий `name`: стрелки по радио ведёт он сам,
	 * отметку группа получает событием `change`, которое он шлёт на каждый
	 * переход.
	 */
	it('RadioGroup: ↓ отмечает следующее радио, группа получает значение', async () => {
		const root = await show(`<div is="so-radio-group" value="a">
			<label is="so-radio-group-item" value="a">Первый</label>
			<label is="so-radio-group-item" value="b">Второй</label>
			<label is="so-radio-group-item" value="c">Третий</label>
		</div>`)
		const group = root.querySelector('[is="so-radio-group"]')
		const radios = [...root.querySelectorAll('input')].filter(
			(node): node is HTMLInputElement => node instanceof HTMLInputElement,
		)

		if (!isGroup(group)) throw new Error('группы нет')

		radios[0]?.focus()
		await userEvent.keyboard('{ArrowDown}')
		await nextFrame()

		expect(document.activeElement).toBe(radios[1])
		expect(radios.map((radio) => radio.checked)).toEqual([false, true, false])
		expect(group.value).toBe('b')
		expect(find(root, '[value="b"].so-radio-group-item', HTMLElement).dataset['selected']).toBe(
			'true',
		)
	})

	/**
	 * Список — одна остановка Tab, по элементам ходят стрелки его клавиатуры.
	 * Остановка — узел списка в корне, не сам корень: рядом с узлом в корне
	 * стоят шапка и подвал. Строку элемента — кнопку на `div` — плагин списка
	 * узнаёт по разметке шаблона элемента: стрелка и Enter с неё — клавиши
	 * списка. Enter выбирает один раз: строка его не нажимает, иначе второе
	 * переключение сняло бы выбор.
	 */
	it('ListBox: стрелка и Enter со строки элемента выбирают его один раз', async () => {
		const root = await show(`<div is="so-list-box">
			<div is="so-list-box-item" value="msk" text="Москва"></div>
			<div is="so-list-box-item" value="spb" text="Петербург"></div>
		</div>`)
		const rows = all(root, '.so-list-box-item .so-button')

		expect(find(root, '.so-list-box > .so-list-box__list', HTMLDivElement).tabIndex).toBe(0)
		expect(find(root, '.so-list-box', HTMLDivElement).tabIndex).toBe(-1)

		rows[0]?.focus()
		await userEvent.keyboard('{ArrowDown}{Enter}')
		await nextFrame()

		expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['true', 'false'])
	})

	/**
	 * Строка — кнопка на `div`, а не `<button>`: выключенная нативная кнопка
	 * фокуса не берёт вовсе (`webc-button.spec.ts`), а выключенный пункт списка
	 * виден, фокусируется и объявляется скринридером недоступным — выбор ему
	 * отказывает список. Клик — `force`: Playwright сам не кликает по
	 * `aria-disabled`, а тема гасит мышь на выключенной строке, и клик уходит
	 * списку.
	 */
	it('ListBox: выключенный пункт фокусируется, клик выбора не меняет', async () => {
		const root = await show(`<div is="so-list-box">
			<div is="so-list-box-item" value="msk" text="Москва"></div>
			<div is="so-list-box-item" value="spb" text="Петербург" disabled></div>
		</div>`)
		const rows = all(root, '.so-list-box-item .so-button')
		const [, off] = rows

		if (!off) throw new Error('строки выключенного пункта нет')

		await userEvent.click(off, { force: true })
		await nextFrame()

		expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(['false', 'false'])
		expect(off.getAttribute('aria-disabled')).toBe('true')
		expect(off.hasAttribute('disabled')).toBe(false)

		off.focus()

		expect(document.activeElement).toBe(off)
	})
})

/** Scope слота `trigger` у Menu — связка кнопки с меню и вид «нажата». */
type TMenuTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

/**
 * Меню Web Components и меню Vue — одна разметка и одни классы: открытая
 * панель меню с частями стоит у триггера, а панель подменю — у его строки, так
 * же, как у Vue. Панели телепортированы, и рамки сверяются от угла якоря —
 * триггера и строки подменю — замером `panel-boxes.ts`, как панели поповера в
 * `webc-frame.spec.ts`. Панелей на экране две, и части каждой ищутся по её
 * `id`, на который ссылается якорь: `aria-controls` триггера и строки.
 */
describe('Menu · панели меню и подменю — как у Vue', () => {
	/** Блок, в котором стоит меню, — один на обе отрисовки. */
	const BLOCK = 'padding: 48px 24px; width: 400px'

	/** Части панели меню — флажки, группа, разделитель, подсказка, стрелка подменю. */
	const PARTS = [
		'.so-menu__list',
		'.so-menu-group',
		'.so-menu-group__label',
		'.so-menu-separator',
		'.so-menu-item',
		'.so-menu-item > .so-button',
		'.so-menu-item__indicator',
		'.so-menu-item__icon',
		'.so-menu-item__shortcut',
		'.so-menu-item__arrow',
	]

	const trigger = () => document.querySelector<HTMLElement>('.so-test-trigger')
	const shareRow = () =>
		document.querySelector<HTMLElement>('.so-menu-item > [aria-haspopup="menu"]')

	/** Панель якоря — по его `aria-controls`. */
	const panelOf = (anchor: HTMLElement | null) =>
		document.getElementById(anchor?.getAttribute('aria-controls') ?? '')

	/** Селектор панели якоря и её частей — по её `id`. */
	function partsOf(anchor: HTMLElement | null): string {
		const panel = `#${CSS.escape(anchor?.getAttribute('aria-controls') ?? '')}`

		return [panel, ...PARTS.map((part) => `${panel} ${part}`)].join(', ')
	}

	const shown = (node: HTMLElement | null) =>
		node !== null && getComputedStyle(node).display !== 'none'

	/**
	 * Открыть меню кликом по триггеру, а с `submenu` — и подменю кликом по его
	 * строке — и замерить открытую панель от её якоря.
	 */
	async function openAndMeasure(submenu: boolean): Promise<TBox[]> {
		const button = trigger()

		if (!button) throw new Error('триггера нет')

		await userEvent.click(button)
		await expect.poll(() => shown(panelOf(trigger()))).toBe(true)

		if (!submenu) return measure(trigger, partsOf(trigger()))

		const row = shareRow()

		if (!row) throw new Error('строки подменю нет')

		await userEvent.click(row)
		await expect.poll(() => shown(panelOf(shareRow()))).toBe(true)

		return measure(shareRow, partsOf(shareRow()))
	}

	/** Меню Vue в блоке — с группой флажков, разделителем, действием и подменю. */
	const vueMenu = (): VNode =>
		h('div', { style: BLOCK }, [
			h(
				Menu,
				{},
				{
					trigger: ({ triggerAria, triggerDataset }: TMenuTriggerScope) =>
						h(Button, {
							text: 'Действия',
							class: 'so-test-trigger',
							...triggerAria,
							...triggerDataset,
						}),
					default: () => [
						h(Menu.Group, { label: 'Вид' }, () => [
							h(Menu.CheckboxItem, { value: 'grid', text: 'Сетка', selected: true }),
							h(Menu.CheckboxItem, { value: 'ruler', text: 'Линейка' }),
						]),
						h(Menu.Separator),
						h(
							Menu.Item,
							{ value: 'edit', text: 'Изменить' },
							{ trailing: () => 'Ctrl+E' },
						),
						h(Menu.Submenu, { value: 'share', text: 'Поделиться' }, () => [
							h(Menu.Item, { value: 'link', text: 'Ссылка' }),
							h(Menu.Item, { value: 'mail', text: 'Почта' }),
						]),
					],
				},
			),
		])

	/** То же меню Web Components — разметкой, как её пишет потребитель. */
	const WEBC_MENU = `<div style="${BLOCK}"><span is="so-menu"><button is="so-button" slot="trigger" class="so-test-trigger" text="Действия"></button><div is="so-menu-group" label="Вид"><div is="so-menu-checkbox-item" value="grid" text="Сетка" selected></div><div is="so-menu-checkbox-item" value="ruler" text="Линейка"></div></div><div is="so-menu-separator"></div><div is="so-menu-item" value="edit" text="Изменить"><span slot="trailing">Ctrl+E</span></div><div is="so-menu-submenu" value="share" text="Поделиться"><div is="so-menu-item" value="link" text="Ссылка"></div><div is="so-menu-item" value="mail" text="Почта"></div></div></span></div>`

	/** Vue: меню открывается, меряется и снимается — следующей отрисовке оно не мешает. */
	async function measureVue(submenu: boolean): Promise<TBox[]> {
		render(defineComponent({ render: vueMenu }))
		await nextTick()
		await nextFrame()

		const boxes = await openAndMeasure(submenu)

		cleanup()

		return boxes
	}

	async function measureWebc(submenu: boolean): Promise<TBox[]> {
		await show(WEBC_MENU)

		return openAndMeasure(submenu)
	}

	it('открытая панель меню и её части стоят у триггера так же, как у Vue', async () => {
		const vue = await measureVue(false)
		const webc = await measureWebc(false)

		// Триггер, панель, список, группа с подписью, разделитель, четыре пункта
		// со строками и их части
		expect(webc.length).toBeGreaterThan(10)
		expect(webc[1].height).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})

	it('открытая панель подменю и её пункты стоят у его строки так же, как у Vue', async () => {
		const vue = await measureVue(true)
		const webc = await measureWebc(true)

		// Строка, панель подменю, список, два пункта со строками и значками
		expect(webc.length).toBeGreaterThan(5)
		expect(webc[1].width).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})
})

describe('Menu · клавиатура', () => {
	/**
	 * Фокус идёт за подсветкой: ↓ с триггера — на первый пункт, дальше по
	 * порядку сквозь группу, выключенный пропускается; → на строке подменю —
	 * его первый пункт, ← — назад на строку; Escape закрывает меню, фокус — на
	 * триггер.
	 */
	it('стрелки ходят по пунктам и между уровнями, Escape возвращает фокус на триггер', async () => {
		const root = await show(
			`<span is="so-menu"><button is="so-button" slot="trigger" class="so-test-trigger" text="Действия"></button><div is="so-menu-group" label="Вид"><div is="so-menu-checkbox-item" value="grid" text="Сетка"></div></div><div is="so-menu-separator"></div><div is="so-menu-item" value="edit" text="Изменить"></div><div is="so-menu-item" value="archive" text="В архив" disabled></div><div is="so-menu-submenu" value="share" text="Поделиться"><div is="so-menu-item" value="link" text="Ссылка"></div><div is="so-menu-item" value="mail" text="Почта"></div></div></span>`,
		)
		const trigger = find(root, '.so-test-trigger', HTMLButtonElement)
		const panelOf = (anchor: Element) =>
			find(
				document,
				`#${CSS.escape(anchor.getAttribute('aria-controls') ?? '')}`,
				HTMLElement,
			)
		const rowOf = (scope: HTMLElement, text: string): HTMLElement => {
			const row = all(scope, '.so-menu-item > .so-button').find(
				(candidate) =>
					candidate.querySelector('.so-button__text')?.textContent?.trim() === text,
			)

			if (!row) throw new Error(`строки «${text}» нет`)

			return row
		}
		const active = () => document.activeElement
		const menu = () => panelOf(trigger)

		trigger.focus()
		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe(rowOf(menu(), 'Сетка'))

		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe(rowOf(menu(), 'Изменить'))

		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe(rowOf(menu(), 'Поделиться'))

		const share = rowOf(menu(), 'Поделиться')

		await userEvent.keyboard('{ArrowRight}')
		await expect.poll(active).toBe(rowOf(panelOf(share), 'Ссылка'))
		expect(share.getAttribute('aria-expanded')).toBe('true')

		await userEvent.keyboard('{ArrowLeft}')
		await expect.poll(active).toBe(share)
		expect(share.getAttribute('aria-expanded')).toBe('false')

		await userEvent.keyboard('{Escape}')
		await expect.poll(active).toBe(trigger)
		expect(trigger.getAttribute('aria-expanded')).toBe('false')
	})

	/**
	 * Меню, переставленное одной операцией, собирается заново, а панель с
	 * пунктами идёт за ним: собирается после меню, и пункты входят в его новую
	 * коллекцию. Порядок колбэков здесь — настоящего браузера, а не jsdom.
	 */
	it('в меню, переставленном одной операцией, стрелки ходят по пунктам и в подменю', async () => {
		const root = await show(
			`<section class="so-test-from"><span is="so-menu"><button is="so-button" slot="trigger" class="so-test-trigger" text="Действия"></button><div is="so-menu-item" value="edit" text="Изменить"></div><div is="so-menu-submenu" value="share" text="Поделиться"><div is="so-menu-item" value="link" text="Ссылка"></div><div is="so-menu-item" value="mail" text="Почта"></div></div></span></section><section class="so-test-to"></section>`,
		)
		const menuRoot = find(root, '[is="so-menu"]', HTMLSpanElement)
		const trigger = find(root, '.so-test-trigger', HTMLButtonElement)
		const panelOf = (anchor: Element) =>
			find(
				document,
				`#${CSS.escape(anchor.getAttribute('aria-controls') ?? '')}`,
				HTMLElement,
			)
		const rowOf = (scope: HTMLElement, text: string): HTMLElement => {
			const row = all(scope, '.so-menu-item > .so-button').find(
				(candidate) =>
					candidate.querySelector('.so-button__text')?.textContent?.trim() === text,
			)

			if (!row) throw new Error(`строки «${text}» нет`)

			return row
		}
		const active = () => document.activeElement

		find(root, '.so-test-to', HTMLElement).appendChild(menuRoot)
		// Слушатели плагинов новой сборки — по `ready` узла, кадром позже
		await nextFrame()
		await nextFrame()

		trigger.focus()
		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe(rowOf(panelOf(trigger), 'Изменить'))

		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe(rowOf(panelOf(trigger), 'Поделиться'))

		const share = rowOf(panelOf(trigger), 'Поделиться')

		await userEvent.keyboard('{ArrowRight}')
		await expect.poll(active).toBe(rowOf(panelOf(share), 'Ссылка'))
		expect(panelOf(trigger).parentElement).toBe(document.body)
		expect(menuRoot.contains(panelOf(trigger))).toBe(false)
	})
})

/**
 * Select Web Components и Select Vue — одна разметка и одни классы: открытая
 * панель с опциями стоит у поля так же, как у Vue. Панель телепортирована, и
 * рамки сверяются от угла корня Select — якоря панели — замером
 * `panel-boxes.ts`, как панели меню выше.
 */
describe('Select · открытая панель — как у Vue', () => {
	/** Блок, в котором стоит Select, — один на обе отрисовки. */
	const BLOCK = 'padding: 48px 24px; width: 320px'

	/** Панель, список, опции, их строки и отметка выбранной. */
	const PARTS =
		'.so-select__panel, .so-select__list, .so-select-item, .so-select-item > .so-button, .so-select-item__indicator'

	const anchor = () => document.querySelector('.so-select')

	/** Открыть панель кликом по полю и замерить её от корня Select. */
	async function openAndMeasure(): Promise<TBox[]> {
		const field = document.querySelector<HTMLElement>('.so-select__field input')

		if (!field) throw new Error('поля нет')

		await userEvent.click(field)
		await expect
			.poll(() =>
				document.querySelector('.so-select__field input')?.getAttribute('aria-expanded'),
			)
			.toBe('true')

		return measure(anchor, PARTS)
	}

	it('открытая панель и её опции стоят у поля так же, как у Vue', async () => {
		render(
			defineComponent({
				render: () =>
					h('div', { style: BLOCK }, [
						h(Select, { value: 'b', indicator: 'start' }, () => [
							h(SelectItem, { value: 'a', text: 'Первый' }),
							h(SelectItem, { value: 'b', text: 'Второй' }),
							h(SelectItem, { value: 'c', text: 'Третий' }),
						]),
					]),
			}),
		)
		await nextTick()
		await nextFrame()

		const vue = await openAndMeasure()

		cleanup()

		await show(`<div style="${BLOCK}"><div is="so-select" value="b" indicator="start">
			<div is="so-select-item" value="a" text="Первый"></div>
			<div is="so-select-item" value="b" text="Второй"></div>
			<div is="so-select-item" value="c" text="Третий"></div>
		</div></div>`)

		const webc = await openAndMeasure()

		// Корень, панель, список, три опции со строками и отметками
		expect(webc.length).toBeGreaterThan(10)
		expect(webc[1].height).toBeGreaterThan(0)
		expect(webc).toEqual(vue)
	})
})

describe('Select · клавиатура', () => {
	/**
	 * Фокус не уходит с поля: стрелки ведут подсветку по опциям через
	 * `aria-activedescendant`, Enter выбирает подсвеченную и закрывает панель.
	 */
	it('стрелки ходят по опциям, Enter выбирает, фокус остаётся на поле', async () => {
		const root = await show(`<div is="so-select">
			<div is="so-select-item" value="msk" text="Москва"></div>
			<div is="so-select-item" value="tula" text="Тула" disabled></div>
			<div is="so-select-item" value="tver" text="Тверь"></div>
		</div>`)
		const field = find(root, '.so-select__field input', HTMLInputElement)
		const active = () =>
			document
				.getElementById(field.getAttribute('aria-activedescendant') ?? '')
				?.textContent?.trim()

		field.focus()
		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe('Москва')
		expect(field.getAttribute('aria-expanded')).toBe('true')

		// Выключенная опция пропускается
		await userEvent.keyboard('{ArrowDown}')
		await expect.poll(active).toBe('Тверь')
		expect(document.activeElement).toBe(field)

		await userEvent.keyboard('{Enter}')
		await expect.poll(() => field.value).toBe('Тверь')
		expect(field.getAttribute('aria-expanded')).toBe('false')
		expect(document.activeElement).toBe(field)
	})
})

describe('Tags · клавиатура', () => {
	/** Весь набор — одна остановка Tab, стрелки ведут фокус по тегам, пробел выбирает. */
	it('→ переносит фокус на следующий тег, пробел выбирает его', async () => {
		const root = await show(`<div is="so-tags" mode="multiple">
			<div is="so-tags-item" value="a" text="A"></div>
			<div is="so-tags-item" value="b" text="B"></div>
			<div is="so-tags-item" value="c" text="C"></div>
		</div>`)
		const rows = all(root, '.so-tags-item > .so-button:first-child')

		rows[0]?.focus()
		await userEvent.keyboard('{ArrowRight}')
		await expect.poll(() => document.activeElement).toBe(rows[1])

		await userEvent.keyboard(' ')
		await expect.poll(() => rows[1]?.getAttribute('aria-selected')).toBe('true')
		expect(rows.map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
	})
})
