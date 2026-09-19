/**
 * Label в настоящем браузере: связь подписи с контролом и её раскладка.
 *
 * Подпись связана с контролом вложением, без `for` и `id`: контрол — первый
 * labelable-потомок `label`. Клик по тексту браузер доводит до поля, а имя
 * поля собирает из всего текста внутри `label`. Ни то ни другое jsdom честно
 * не выполняет, и раскладку сторон и выравнивание по первой строке он не
 * считает вовсе — поэтому спек браузерный.
 *
 * Проверяются три контрола, которые подписывает Label: CheckBox, Switch и
 * радио. Радио внутри подписи — с `tag="span"`: его корень — тоже `label`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type Component, type VNode } from 'vue'
import type { TComponentSize, TDirection, TLabelPosition } from '@soldy/core'
import { CheckBox, Label, RadioGroup, Switch } from '@soldy/ui-vue'

import '@soldy/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const TEXT = 'Согласен'

/** Длинная подпись: в узкой сцене переносится на несколько строк. */
const LONG_TEXT = 'Согласен с условиями обработки данных и получения писем о новостях сервиса'

type TProps = Record<string, unknown>

/** Где текст относительно контрола на экране. */
type TSide = 'left' | 'right' | 'above' | 'below'

type TCase = {
	name: string
	/** Роль поля: по ней и имени `getByRole` ищет контрол. */
	role: string
	/** Видимая часть контрола — её центр ровняется по первой строке текста. */
	box: string
	/** Что контрол отдаёт v-model, когда клик его отметил. */
	picked: unknown
	/** Разметка: подпись с пропами `label` и контрол с пропами `control`. */
	tree: (label: TProps, control: TProps) => VNode
}

const CASES: readonly TCase[] = [
	{
		name: 'CheckBox',
		role: 'checkbox',
		box: '.s-check-box',
		picked: true,
		// Текст в слоте отметки: в имя его не пускает `aria-hidden` коробки
		tree: (label, control) => h(Label, label, () => h(CheckBox, control, { icon: () => 'V' })),
	},
	{
		name: 'Switch',
		role: 'switch',
		box: '.s-switch__track',
		picked: true,
		// Текст в слотах ручки: в имя его не пускает `aria-hidden` дорожки
		tree: (label, control) =>
			h(Label, label, () => h(Switch, control, { on: () => 'I', off: () => 'O' })),
	},
	{
		name: 'RadioGroup.Item',
		role: 'radio',
		box: '.s-radio-group-item__control',
		picked: 'a',
		// Группа раздаёт радио `size` и собирает v-model
		tree: (label, control) =>
			h(RadioGroup as Component, control, () =>
				h(Label, label, () => h(RadioGroup.Item, { value: 'a', tag: 'span' })),
			),
	},
]

/** Смонтировать разметку и дождаться кадра: слушатели поля плагины вешают по `ready`. */
async function show(content: () => VNode, width?: number): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { style: width ? `width: ${width}px` : undefined }, [content()]),
		}),
	)

	await nextTick()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): Element {
	const element = document.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/** Поле контрола в подписи. */
function input(): HTMLInputElement {
	const element = find('.s-label input')

	if (!(element instanceof HTMLInputElement)) throw new Error('поля в подписи нет')

	return element
}

/**
 * Прямоугольники строк текста подписи: по одному на строку.
 *
 * Текстовый узел ищется среди детей: вокруг содержимого слота Vue ставит
 * пустые узлы-якоря фрагмента, и у них прямоугольников нет.
 */
function lines(): DOMRect[] {
	const text = [...find('.s-label__text').childNodes].find(
		(node) => node instanceof Text && node.data.trim() !== '',
	)

	if (!text) throw new Error('текста в подписи нет')

	const range = document.createRange()

	range.selectNodeContents(text)

	return [...range.getClientRects()]
}

const middle = (rect: DOMRect): number => rect.top + rect.height / 2

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(CASES)('$name в подписи', ({ role, box, picked, tree }) => {
	/**
	 * Клик по тексту браузер отдаёт полю вторым кликом, и поле меняется один
	 * раз. Предки подписи получают оба клика — так ведёт себя любой `label`, и
	 * гасить второй не нужно: `change` приходит один.
	 */
	it('клик по тексту переключает контрол один раз', async () => {
		const values: unknown[] = []
		let changes = 0

		await show(() =>
			tree({ text: TEXT }, { 'onUpdate:value': (value: unknown) => values.push(value) }),
		)

		input().addEventListener('change', () => changes++)

		await userEvent.click(find('.s-label__text'))

		expect(input().checked).toBe(true)
		expect(changes).toBe(1)
		await expect.poll(() => values).toEqual([picked])
	})

	/**
	 * Имя — весь текст внутри `label`. Декор контрола (слоты отметки и ручки)
	 * скрыт `aria-hidden`, распорка выравнивания — `invisible`, поэтому имя
	 * совпадает с текстом подписи точно — и до клика, и после.
	 */
	it('имя поля — ровно текст подписи', async () => {
		await show(() => tree({ text: TEXT }, {}))

		const named = () => page.getByRole(role, { name: TEXT, exact: true }).query()

		expect(named()).toBe(input())

		await userEvent.click(find('.s-label__text'))
		await nextFrame()

		expect(input().checked).toBe(true)
		expect(named()).toBe(input())
	})

	/**
	 * Сбоку от текста контрол стоит по центру первой строки, а не всего
	 * абзаца — какой бы ни была высота контрола относительно строки. Размеры
	 * подписи и контрола задаются порознь, поэтому проверяются и несовпавшие:
	 * контрол выше строки (`sm` у подписи, `2xl` у контрола) и ниже её.
	 */
	it.each(['start', 'end'] as const)(
		'сбоку (%s) контрол — по центру первой строки',
		async (position) => {
			const pairs = [
				['sm', 'sm'],
				['normal', 'normal'],
				['2xl', '2xl'],
				['sm', '2xl'],
				['2xl', 'sm'],
			] satisfies [TComponentSize, TComponentSize][]

			for (const [labelSize, controlSize] of pairs) {
				const sizes = `подпись ${labelSize}, контрол ${controlSize}`

				await show(
					() =>
						tree({ text: LONG_TEXT, position, size: labelSize }, { size: controlSize }),
					180,
				)

				const rows = lines()
				const control = find(box).getBoundingClientRect()

				expect(rows.length, `${sizes}: подпись в несколько строк`).toBeGreaterThan(1)
				expect(
					Math.abs(middle(control) - middle(rows[0])),
					`${sizes}: центр контрола и первой строки`,
				).toBeLessThanOrEqual(1)

				cleanup()
			}
		},
	)

	/**
	 * Порядок в DOM один — контрол, потом текст; сторону рисует тема. `start`
	 * и `end` логические: в RTL текст встаёт с другой стороны сам.
	 */
	it.each([
		['ltr', 'start', 'left'],
		['ltr', 'end', 'right'],
		['rtl', 'start', 'right'],
		['rtl', 'end', 'left'],
		['ltr', 'top', 'above'],
		['rtl', 'bottom', 'below'],
	] satisfies [TDirection, TLabelPosition, TSide][])(
		'%s, %s — текст %s от контрола',
		async (direction, position, side) => {
			await show(() => tree({ text: TEXT, position, direction }, {}))

			const text = find('.s-label__text').getBoundingClientRect()
			const control = find('.s-label__control').getBoundingClientRect()

			const placed: Record<TSide, boolean> = {
				left: text.right <= control.left,
				right: text.left >= control.right,
				above: text.bottom <= control.top,
				below: text.top >= control.bottom,
			}

			expect(placed[side]).toBe(true)
		},
	)
})
