/**
 * Поля и подпись Web Components в настоящем браузере: `<div is="so-input">`,
 * `<span is="so-check-box">`, `<span is="so-switch">` и `<label is="so-label">`.
 *
 * Корень — элемент потребителя, а `<input>` — узел шаблона в обычном DOM
 * страницы, и всё, что браузер делает с полем, он делает сам: печать с
 * кареткой в середине текста, переключение флажка кликом по тексту подписи.
 * jsdom ни того, ни другого честно не выполняет, а раскладки не считает вовсе
 * — поэтому спек браузерный. Теме корень поля Web Components — то же, что
 * корень остальных адаптеров: коробка флажка, дорожка переключателя и поле
 * каждого размера стоят так же, как у Vue. Разметку и наборы ядра сторожат
 * `ui/webc/__tests__/input.spec.ts`, `checkable.spec.ts` и `label.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { CheckBox, Input, Switch } from '@soldy-ui/vue'
import { TInputElement, type TInputElementProps } from '@soldy-ui/webc'

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
})
