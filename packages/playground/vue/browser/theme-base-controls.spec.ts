/**
 * Общий слой тем без темы: страница только с CSS базы (`@soldy-ui/theme-base`),
 * без `@soldy-ui/theme-oren`.
 *
 * Структура частей — раскладка и механика — лежит в базе, а облик в теме
 * (`packages/themes/base/AGENTS.md`, «Перенос структуры»). Без темы части
 * голые — без цвета, рамок и скруглений, — но рабочие: переключатели
 * переключаются кликом по своей видимой части, подпись переключает контрол,
 * слоты кнопки стоят у краёв, а подпись и справка — по своим сторонам. Здесь
 * это и проверяется — тем, что видит пользователь, а не числами базы:
 * сторожа CSS (`themes/base/__tests__/`) раскладки не считают, а спеки с темой
 * держат базу под темой, и потерянное ею правило тема могла бы закрыть своим.
 *
 * Страница у файла спека своя (`isolate` прогона), и листа темы на ней нет —
 * это проверяет первый тест. Проверен поломкой: без места поля Switch в базе
 * (`position` у `.so-switch input`) клик по дорожке переключатель не
 * переключает.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type Component, type VNode } from 'vue'
import type { TFieldPosition } from '@soldy-ui/core'
import { Button, CheckBox, Field, Input, Label, RadioGroup, Switch } from '@soldy-ui/vue'

import '@soldy-ui/theme-base'

/** Допуск на субпиксельное округление координат, px. */
const EPSILON = 0.5

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Разметка на странице и кадр: слушатели поля плагины вешают по `ready`. */
async function show(content: () => VNode | VNode[], dir?: 'ltr' | 'rtl'): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { dir, style: 'padding: 16px; width: 480px' }, content()),
		}),
	)

	await nextTick()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Поле контрола; не поле — тест падает здесь. */
function field(selector: string): HTMLInputElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLInputElement)) throw new Error(`${selector}: поля нет`)

	return element
}

const box = (element: Element) => element.getBoundingClientRect()

/**
 * Клик пользователя в середину видимой части контрола. Целью — корень
 * контрола с точкой от его угла: в середине видимой части стоит невидимое
 * поле, и клик по самой части Playwright счёл бы перехваченным. Попадание в
 * поле — то, что и проверяется: переключает его браузер.
 */
async function clickPart(root: HTMLElement, part: HTMLElement): Promise<void> {
	const outer = box(root)
	const inner = box(part)

	await userEvent.click(root, {
		position: {
			x: inner.left - outer.left + inner.width / 2,
			y: inner.top - outer.top + inner.height / 2,
		},
	})
}

afterEach(() => {
	cleanup()
})

describe('страница — только общий слой тем', () => {
	it('переменные базы на месте, токенов темы нет', () => {
		const root = getComputedStyle(document.documentElement)

		expect(root.getPropertyValue('--so-button-height-normal')).not.toBe('')
		expect(root.getPropertyValue('--so-component-text')).toBe('')
		expect(root.getPropertyValue('--so-neutral-500')).toBe('')
	})
})

describe('переключатели — кликом по видимой части', () => {
	it('Switch — по дорожке', async () => {
		await show(() => h(Switch))

		await clickPart(find('.so-switch'), find('.so-switch__track'))

		expect(field('.so-switch input').checked).toBe(true)
	})

	it('CheckBox — по коробке', async () => {
		await show(() => h(CheckBox))

		await clickPart(find('.so-check-box'), find('.so-check-box__container'))

		expect(field('.so-check-box input').checked).toBe(true)
	})

	it('радио — по кольцу', async () => {
		await show(() =>
			h(RadioGroup as Component, null, () => [
				h(RadioGroup.Item, { value: 'a', class: 'so-test-a' }),
				h(RadioGroup.Item, { value: 'b', class: 'so-test-b' }),
			]),
		)

		const item = find('.so-test-b')

		await clickPart(item, find('.so-radio-group-item__control', item))

		expect(field('.so-test-b input').checked).toBe(true)
		expect(field('.so-test-a input').checked).toBe(false)
	})
})

describe('ручка Switch — по направлению строки', () => {
	it.each(['ltr', 'rtl'] as const)(
		'%s: выключенная у начала, включённая у конца',
		async (dir) => {
			await show(() => h(Switch), dir)

			const track = find('.so-switch__track')
			const thumb = find('.so-switch__track--thumb')

			/** Отступ ручки от края дорожки в начале и в конце строки. */
			const insets = () => {
				const outer = box(track)
				const inner = box(thumb)
				const left = inner.left - outer.left
				const right = outer.right - inner.right

				return dir === 'ltr' ? { start: left, end: right } : { start: right, end: left }
			}

			const off = insets()
			const edge = box(thumb).top - box(track).top

			// Ручка стоит в дорожке на одном отступе со всех сторон
			expect(off.start).toBeGreaterThan(0)
			expect(Math.abs(off.start - edge)).toBeLessThanOrEqual(EPSILON)
			expect(off.end).toBeGreaterThan(off.start)

			await clickPart(find('.so-switch'), track)
			await nextFrame()

			const on = insets()

			expect(Math.abs(on.end - off.start)).toBeLessThanOrEqual(EPSILON)
			expect(on.start).toBeGreaterThan(on.end)
		},
	)
})

describe('подпись Label', () => {
	/** Контролы, которые подписывает Label: радио в подписи — с `tag="span"`. */
	const CASES: readonly { name: string; tree: () => VNode; picked: string }[] = [
		{
			name: 'CheckBox',
			tree: () => h(Label, { text: 'Согласен' }, () => h(CheckBox)),
			picked: '.so-check-box input',
		},
		{
			name: 'Switch',
			tree: () => h(Label, { text: 'Уведомления' }, () => h(Switch)),
			picked: '.so-switch input',
		},
		{
			name: 'радио',
			tree: () =>
				h(RadioGroup as Component, null, () =>
					h(Label, { text: 'Первый' }, () =>
						h(RadioGroup.Item, { value: 'a', tag: 'span' }),
					),
				),
			picked: '.so-radio-group-item input',
		},
	]

	it.each(CASES)('$name: клик по тексту переключает контрол', async ({ tree, picked }) => {
		await show(tree)

		await userEvent.click(find('.so-label__text'))

		expect(field(picked).checked).toBe(true)
	})

	/** Где текст относительно контрола на экране, в LTR. */
	const SIDES = [
		['end', (text: DOMRect, control: DOMRect) => text.left >= control.right],
		['start', (text: DOMRect, control: DOMRect) => text.right <= control.left],
		['top', (text: DOMRect, control: DOMRect) => text.bottom <= control.top],
		['bottom', (text: DOMRect, control: DOMRect) => text.top >= control.bottom],
	] as const

	it.each(SIDES)('position %s: текст — по своей стороне от контрола', async (position, side) => {
		await show(() => h(Label, { text: 'Согласен', position }, () => h(CheckBox)))

		const text = box(find('.so-label__text'))
		const control = box(find('.so-check-box'))

		expect(side(text, control)).toBe(true)
	})
})

describe('слоты Button', () => {
	it.each(['ltr', 'rtl'] as const)(
		'%s: слоты у краёв, область текста — всё место между ними',
		async (dir) => {
			const slot = (mark: string) =>
				h('span', {
					class: `so-test-${mark}`,
					style: 'display: block; width: 16px; height: 16px',
				})

			await show(
				() =>
					h(
						Button,
						{ text: 'Сохранить', style: 'width: 320px' },
						{ leading: () => slot('leading'), trailing: () => slot('trailing') },
					),
				dir,
			)

			const button = box(find('.so-button'))
			const text = box(find('.so-button__text'))
			const start = box(find('.so-test-leading'))
			const end = box(find('.so-test-trailing'))

			// В строке: начало — слева в LTR и справа в RTL
			const line = dir === 'ltr' ? [start, text, end] : [end, text, start]

			for (let index = 1; index < line.length; index++) {
				expect(line[index].left).toBeGreaterThan(line[index - 1].right - EPSILON)
			}

			// Слоты — у краёв, на одном поле от них
			const inset = dir === 'ltr' ? start.left - button.left : button.right - start.right
			const outset = dir === 'ltr' ? button.right - end.right : end.left - button.left

			expect(inset).toBeGreaterThan(0)
			expect(Math.abs(inset - outset)).toBeLessThanOrEqual(EPSILON)

			// Область текста — всё место между слотами, на одном зазоре от обоих
			const before = dir === 'ltr' ? text.left - start.right : start.left - text.right
			const after = dir === 'ltr' ? end.left - text.right : text.left - end.right

			expect(Math.abs(before - after)).toBeLessThanOrEqual(EPSILON)
			expect(text.width).toBeGreaterThan(button.width / 2)
		},
	)
})

describe('справка Field', () => {
	const tree = (position: TFieldPosition) => () =>
		h(Field, { label: 'Почта', helper: 'Не покажем никому', position }, () => h(Input))

	it('top: подпись над контролом, подсказка — под ним', async () => {
		await show(tree('top'))

		const label = box(find('.so-field__label'))
		const control = box(find('.so-field__control'))
		const helper = box(find('.so-field__helper'))

		expect(label.bottom).toBeLessThanOrEqual(control.top + EPSILON)
		expect(helper.top).toBeGreaterThanOrEqual(control.bottom - EPSILON)
	})

	it('start: подпись слева от контрола, подсказка — под колонкой контрола', async () => {
		await show(tree('start'))

		const label = box(find('.so-field__label'))
		const control = box(find('.so-field__control'))
		const helper = box(find('.so-field__helper'))

		expect(label.right).toBeLessThanOrEqual(control.left + EPSILON)
		expect(helper.top).toBeGreaterThanOrEqual(control.bottom - EPSILON)
		expect(Math.abs(helper.left - control.left)).toBeLessThanOrEqual(EPSILON)
	})
})
