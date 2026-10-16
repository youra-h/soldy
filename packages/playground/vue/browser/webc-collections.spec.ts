/**
 * Коллекции Web Components в настоящем браузере: `<div is="so-tabs">`,
 * `<div is="so-accordion">`, `<div is="so-radio-group">` и
 * `<div is="so-list-box">`.
 *
 * Теме корень элемента коллекции Web Components — то же, что корень остальных
 * адаптеров: строка таба и его кнопка закрытия, заголовок секции и её стрелка,
 * радио и его кольцо, строка элемента списка — кнопка на `div` — и его отметка
 * каждого размера стоят так же, как у Vue. Клавиатура — то, чего jsdom не
 * выполняет: стрелки по табам и списку ведёт плагин владельца, а по радио —
 * сам браузер, по общему `name` группы. Разметку и наборы ядра сторожат
 * `ui/webc/__tests__/tabs.spec.ts`, `accordion.spec.ts`, `radio-group.spec.ts`
 * и `list-box.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import {
	Accordion,
	AccordionItem,
	ListBox,
	ListBoxItem,
	RadioGroup,
	RadioGroupItem,
	Tabs,
	TabsItem,
} from '@soldy-ui/vue'
import { TRadioGroupElement, type TRadioGroupElementProps } from '@soldy-ui/webc'

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
	 * Строку элемента — кнопку на `div` — плагин списка узнаёт по разметке
	 * шаблона элемента: стрелка и Enter с неё — клавиши списка. Enter выбирает
	 * один раз: строка его не нажимает, иначе второе переключение сняло бы выбор.
	 */
	it('ListBox: стрелка и Enter со строки элемента выбирают его один раз', async () => {
		const root = await show(`<div is="so-list-box">
			<div is="so-list-box-item" value="msk" text="Москва"></div>
			<div is="so-list-box-item" value="spb" text="Петербург"></div>
		</div>`)
		const rows = all(root, '.so-list-box-item .so-button')

		expect(find(root, '.so-list-box', HTMLDivElement).tabIndex).toBe(0)

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
