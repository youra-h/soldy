/**
 * Поля и подпись Web Components в настоящем браузере: `<div is="so-input">`,
 * `<div is="so-number-input">`, `<div is="so-textarea">`,
 * `<span is="so-check-box">`, `<span is="so-switch">`, `<label is="so-label">`
 * и поле формы `<div is="so-field">`.
 *
 * Корень — элемент потребителя, а `<input>` — узел шаблона в обычном DOM
 * страницы, и всё, что браузер делает с полем, он делает сам: печать с
 * кареткой в середине текста, переключение флажка кликом по тексту подписи.
 * jsdom ни того, ни другого честно не выполняет, а раскладки не считает вовсе
 * — поэтому спек браузерный. Теме корень поля Web Components — то же, что
 * корень остальных адаптеров: коробка флажка, дорожка переключателя, поле
 * каждого размера и кнопки шага поля числа стоят так же, как у Vue, а части
 * поля формы — на тех же местах на каждой стороне подписи. Разметку и наборы
 * ядра сторожат `ui/webc/__tests__/input.spec.ts`, `number-input.spec.ts`,
 * `checkable.spec.ts`, `label.spec.ts` и `field.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import type { TFieldPosition } from '@soldy-ui/core'
import { CheckBox, Field, Input, NumberInput, Switch, Textarea } from '@soldy-ui/vue'
import {
	TInputElement,
	TNumberInputElement,
	type TInputElementProps,
	type TNumberInputElementProps,
} from '@soldy-ui/webc'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел разметки Web Components теста — снимается после каждого. */
let stage: HTMLElement | null = null

/**
 * Разметка на странице, слушатели плагинов — на поле. Плагины ввода и флажка
 * вешают их по `ready` узла, а `TElementPlugin` объявляет узел через кадр.
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

function isInput(node: Element | null): node is TInputElementProps {
	return node instanceof TInputElement
}

function isNumberInput(node: Element | null): node is TNumberInputElementProps {
	return node instanceof TNumberInputElement
}

/** Размер узла на странице. */
function size(node: Element) {
	const { width, height } = node.getBoundingClientRect()

	return { width, height }
}

describe('Input · печать', () => {
	/**
	 * Браузер вставил символ и поставил каретку за ним, ядро приняло текст, и
	 * шаблон его не переписывает — каретка там, где её оставил браузер, и
	 * следующий символ встаёт за первым, а не в конец поля.
	 */
	it('печать в середину текста — каретка на месте, ядро получает текст', async () => {
		const root = await show('<div is="so-input" value="abcd"></div>')
		const input = root.querySelector('[is="so-input"]')

		if (!isInput(input)) throw new Error('<div is="so-input"> нет')

		const field = find(input, 'input', HTMLInputElement)

		await userEvent.click(field)
		field.setSelectionRange(2, 2)
		await userEvent.keyboard('XY')
		await nextFrame()

		expect(field.value).toBe('abXYcd')
		expect(input.ctrl?.value).toBe('abXYcd')
		expect([field.selectionStart, field.selectionEnd]).toEqual([4, 4])
	})
})

describe('NumberInput · печать', () => {
	/**
	 * Цифра в середину числа: браузер вставил её и поставил каретку за ней,
	 * ядро приняло текст и число, и шаблон текст не переписывает — каретка там,
	 * где её оставил браузер. Буква гасится до правки и каретку не двигает.
	 */
	it('цифра в середину числа — каретка на месте, ядро получает число; буква не встаёт', async () => {
		const root = await show('<div is="so-number-input" value="12"></div>')
		const input = root.querySelector('[is="so-number-input"]')

		if (!isNumberInput(input)) throw new Error('<div is="so-number-input"> нет')

		const field = find(input, '.so-number-input__input', HTMLInputElement)

		await userEvent.click(field)
		field.setSelectionRange(1, 1)
		await userEvent.keyboard('5')
		await nextFrame()

		expect(field.value).toBe('152')
		expect(input.ctrl?.value).toBe(152)
		expect([field.selectionStart, field.selectionEnd]).toEqual([2, 2])

		await userEvent.keyboard('a')
		await nextFrame()

		expect(field.value).toBe('152')
		expect([field.selectionStart, field.selectionEnd]).toEqual([2, 2])
	})
})

describe('Label · клик по тексту', () => {
	it.each([
		['CheckBox', 'so-check-box'],
		['Switch', 'so-switch'],
	])('%s в подписи: клик по тексту переключает поле одним change', async (_name, is) => {
		const root = await show(
			`<label is="so-label" text="Согласен"><span is="${is}"></span></label>`,
		)
		const field = find(root, 'input', HTMLInputElement)
		let changes = 0

		field.addEventListener('change', () => changes++)

		await userEvent.click(find(root, '.so-label__text', HTMLElement))
		await nextFrame()

		expect(field.checked).toBe(true)
		expect(changes).toBe(1)
		expect(field.labels?.[0]).toBe(find(root, '.so-label', HTMLLabelElement))
	})
})

/**
 * Поле Web Components и поле Vue одного размера стоят рядом — в одинаковых
 * блоках одной ширины. Тема видит у них одни классы и одну разметку внутри
 * корня, и коробка, дорожка и поле получаются одних размеров.
 */
describe.each(COMPONENT_SIZES)('размер %s — как у Vue', (scale) => {
	/** Блок одной ширины для пары полей: поле растягивается по нему. */
	const BOX = 'width: 240px'

	async function pair(vue: () => ReturnType<typeof h>, html: string): Promise<HTMLElement> {
		render(defineComponent({ render: () => h('div', { class: 'vue', style: BOX }, [vue()]) }))
		await nextTick()

		return show(`<div class="webc" style="${BOX}">${html}</div>`)
	}

	it('CheckBox: корень и коробка', async () => {
		const root = await pair(
			() => h(CheckBox, { size: scale, value: true }),
			`<span is="so-check-box" size="${scale}" value></span>`,
		)

		for (const part of ['.so-check-box', '.so-check-box__container']) {
			const vue = size(find(document, `.vue ${part}`, HTMLElement))

			expect(vue.width).toBeGreaterThan(0)
			expect(size(find(root, `.webc ${part}`, HTMLElement))).toEqual(vue)
		}
	})

	it('Switch: корень и дорожка', async () => {
		const root = await pair(
			() => h(Switch, { size: scale }),
			`<span is="so-switch" size="${scale}"></span>`,
		)

		for (const part of ['.so-switch', '.so-switch__track', '.so-switch__track--thumb']) {
			const vue = size(find(document, `.vue ${part}`, HTMLElement))

			expect(vue.width).toBeGreaterThan(0)
			expect(size(find(root, `.webc ${part}`, HTMLElement))).toEqual(vue)
		}
	})

	it('Input: корень, поле и кнопка очистки', async () => {
		const root = await pair(
			() => h(Input, { size: scale, value: 'текст', clearable: true }),
			`<div is="so-input" size="${scale}" value="текст" clearable></div>`,
		)

		for (const part of ['.so-input', '.so-input input', '.so-input__clear']) {
			const vue = size(find(document, `.vue ${part}`, HTMLElement))

			expect(vue.width).toBeGreaterThan(0)
			expect(size(find(root, `.webc ${part}`, HTMLElement))).toEqual(vue)
		}
	})

	it('NumberInput: корень, ввод, кнопки шага и очистки', async () => {
		const root = await pair(
			() => h(NumberInput, { size: scale, value: 12, clearable: true }),
			`<div is="so-number-input" size="${scale}" value="12" clearable></div>`,
		)

		for (const part of [
			'.so-number-input',
			'.so-number-input__input',
			'.so-number-input__clear',
			'.so-number-input__decrement',
			'.so-number-input__increment',
		]) {
			const vue = size(find(document, `.vue ${part}`, HTMLElement))

			expect(vue.width).toBeGreaterThan(0)
			expect(size(find(root, `.webc ${part}`, HTMLElement))).toEqual(vue)
		}
	})

	it('Textarea: корень, поле и счётчик', async () => {
		const root = await pair(
			() => h(Textarea, { size: scale, value: 'текст', maxlength: 200, counter: true }),
			`<div is="so-textarea" size="${scale}" value="текст" maxlength="200" counter></div>`,
		)

		for (const part of ['.so-textarea', '.so-textarea textarea', '.so-textarea__counter']) {
			const vue = size(find(document, `.vue ${part}`, HTMLElement))

			expect(vue.width).toBeGreaterThan(0)
			expect(size(find(root, `.webc ${part}`, HTMLElement))).toEqual(vue)
		}
	})
})

/**
 * Подпись поля формы называет поле своим `for`: клик по ней браузер доводит
 * до поля — у поля ввода это фокус, у флажка — переключение.
 */
describe('Field · клик по подписи', () => {
	it('поле ввода — фокус на поле', async () => {
		const root = await show('<div is="so-field" label="Почта"><div is="so-input"></div></div>')

		await userEvent.click(find(root, '.so-field__label', HTMLLabelElement))

		expect(document.activeElement).toBe(find(root, '.so-input input', HTMLInputElement))
	})

	it('флажок — переключается одним change', async () => {
		const root = await show(
			'<div is="so-field" label="Согласие"><span is="so-check-box"></span></div>',
		)
		const field = find(root, 'input', HTMLInputElement)
		let changes = 0

		field.addEventListener('change', () => changes++)

		await userEvent.click(find(root, '.so-field__label', HTMLLabelElement))
		await nextFrame()

		expect(field.checked).toBe(true)
		expect(changes).toBe(1)
	})
})

/** Место узла в блоке — от его угла — и размер, в пикселях. */
function placeIn(node: Element, block: Element) {
	const outer = block.getBoundingClientRect()
	const inner = node.getBoundingClientRect()

	return {
		x: Math.round(inner.left - outer.left),
		y: Math.round(inner.top - outer.top),
		width: Math.round(inner.width),
		height: Math.round(inner.height),
	}
}

/**
 * Поле формы Web Components и поле Vue с теми же частями стоят рядом — в
 * одинаковых блоках одной ширины. Тема видит у них одни классы и одну
 * разметку внутри корня: подпись, контрол, подсказка и ошибка со значком
 * встают на те же места и тех же размеров на каждой стороне подписи. Значок у
 * Web Components — `<span is="so-icon">` с рисунком внутри, а у Vue — сам
 * `<svg>`: для темы это один корень.
 */
describe.each(['top', 'start', 'end'] as const)('Field, подпись %s — как у Vue', (position) => {
	/** Блок одной ширины для пары полей. */
	const BOX = 'width: 360px'

	async function pair(
		props: { invalid?: boolean; position: TFieldPosition },
		attributes: string,
	): Promise<{ vue: Element; webc: Element }> {
		render(
			defineComponent({
				render: () =>
					h('div', { class: 'vue', style: BOX }, [
						h(
							Field,
							{ label: 'Почта', helper: 'Подсказка', error: 'Нет @', ...props },
							() => h(Input),
						),
					]),
			}),
		)
		await nextTick()

		const root = await show(
			`<div class="webc" style="${BOX}"><div is="so-field" label="Почта" helper="Подсказка" error="Нет @" ${attributes}><div is="so-input"></div></div></div>`,
		)

		return { vue: find(document, '.vue', HTMLElement), webc: find(root, '.webc', HTMLElement) }
	}

	it('подпись, контрол и подсказка', async () => {
		const { vue, webc } = await pair({ position }, `position="${position}"`)

		for (const part of [
			'.so-field',
			'.so-field__label',
			'.so-field__control',
			'.so-input',
			'.so-field__helper',
		]) {
			const expected = placeIn(find(vue, part, HTMLElement), vue)

			expect(expected.width).toBeGreaterThan(0)
			expect(placeIn(find(webc, part, HTMLElement), webc)).toEqual(expected)
		}
	})

	it('ошибка со значком — на месте подсказки', async () => {
		const { vue, webc } = await pair(
			{ position, invalid: true },
			`position="${position}" invalid`,
		)

		expect(webc.querySelector('.so-field__helper')).toBeNull()

		for (const part of ['.so-field__error', '.so-field__error-icon', '.so-field__error-text']) {
			const expected = placeIn(find(vue, part, Element), vue)

			expect(expected.width).toBeGreaterThan(0)
			expect(placeIn(find(webc, part, Element), webc)).toEqual(expected)
		}
	})
})
