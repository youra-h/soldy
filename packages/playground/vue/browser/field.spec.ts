/**
 * Field в настоящем браузере: связь подписи с контролом и раскладка поля.
 *
 * Подпись называет labelable-контрол своим `for`: клик по ней браузер доводит
 * до поля — у поля ввода это фокус, у флажка — переключение, — а текст
 * становится именем поля. Группу (DateInput, DatePicker, RadioGroup) подпись
 * называет ссылкой `aria-labelledby`, и клик по ней ничего не делает. Ни то
 * ни другое jsdom честно не выполняет.
 *
 * Раскладку сторон jsdom не считает вовсе. Сбоку (`start`) первая строка
 * подписи стоит по центру контрола — у поля ввода, выбора и даты это строка
 * его текста, у флажка, переключателя и оценки — их середина, — на любом
 * размере. Колонку подписи задаёт `--so-field-columns`: одна колонка ставит
 * подпись над контролом пиксель в пиксель, как `top`. Подсказка стоит под
 * колонкой контрола и от него не отрывается, сколько бы строк ни заняла
 * подпись.
 *
 * В режиме принудительных цветов цвет рамки браузер заменяет системным, и
 * ошибку от покоя отличает толщина: рамка поля и коробки флажка вдвое толще.
 * Фон там браузер заменяет цветом страницы, а точка обязательного поля — фон:
 * она обязана остаться видна и у подписи, и у контрола без подписи.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type Component, type VNode } from 'vue'
import type { TComponentSize } from '@soldy-ui/core'
import {
	CheckBox,
	DateInput,
	DatePicker,
	Field,
	Input,
	RadioGroup,
	Rating,
	Select,
	Switch,
	Textarea,
} from '@soldy-ui/vue'

import { contrast, find, style, systemColor } from './colors'
import { forcedColors } from './media'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const SIZES: readonly TComponentSize[] = ['sm', 'normal', 'lg', 'xl', '2xl']

/** Длинная подпись: в колонке подписи переносится на несколько строк. */
const LONG_LABEL = 'Адрес электронной почты для писем о заказе'

/** Смонтировать разметку в сцене заданной ширины и дождаться кадра плагинов. */
async function show(content: () => VNode, width = 360): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { style: `width: ${width}px` }, [content()]),
		}),
	)

	await nextTick()
	await nextFrame()
}

const rect = (selector: string): DOMRect => find(selector).getBoundingClientRect()

const middle = (box: DOMRect): number => box.top + box.height / 2

/**
 * Строки текста подписи — по прямоугольнику на строку. Текстовый узел ищется
 * среди детей: вокруг содержимого слота Vue ставит пустые узлы-якоря.
 */
function lines(): DOMRect[] {
	const text = [...find('.so-field__label').childNodes].find(
		(node) => node instanceof Text && node.data.trim() !== '',
	)

	if (!text) throw new Error('текста в подписи нет')

	const range = document.createRange()

	range.selectNodeContents(text)

	return [...range.getClientRects()]
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('клик по подписи', () => {
	it('поле ввода — фокус на поле, имя — текст подписи', async () => {
		await show(() => h(Field, { label: 'Почта' }, () => h(Input)))

		const input = find('.so-input input')

		await userEvent.click(find('.so-field__label'))

		expect(document.activeElement).toBe(input)
		expect(page.getByRole('textbox', { name: 'Почта', exact: true }).query()).toBe(input)
	})

	it('Select — фокус на поле комбобокса, имя — текст подписи', async () => {
		await show(() => h(Field, { label: 'Город' }, () => h(Select)))

		const combobox = find('.so-select input')

		await userEvent.click(find('.so-field__label'))

		expect(document.activeElement).toBe(combobox)
		expect(page.getByRole('combobox', { name: 'Город', exact: true }).query()).toBe(combobox)
	})

	it('флажок — переключается один раз', async () => {
		const values: unknown[] = []
		let changes = 0

		await show(() =>
			h(Field, { label: 'Согласен', position: 'end' }, () =>
				h(CheckBox, { 'onUpdate:value': (value: unknown) => values.push(value) }),
			),
		)

		const input = find('.so-check-box input')

		if (!(input instanceof HTMLInputElement)) throw new Error('поля флажка нет')

		input.addEventListener('change', () => changes++)

		await userEvent.click(find('.so-field__label'))

		expect(input.checked).toBe(true)
		expect(changes).toBe(1)
		await expect.poll(() => values).toEqual([true])
	})

	it('группа радио — подпись только называет её: клик ничего не выбирает', async () => {
		await show(() =>
			h(Field, { label: 'Доставка' }, () =>
				h(RadioGroup as Component, null, () => [
					h(RadioGroup.Item, { value: 'a' }, () => 'Курьером'),
					h(RadioGroup.Item, { value: 'b' }, () => 'Самовывоз'),
				]),
			),
		)

		await userEvent.click(find('.so-field__label'))

		const radios = [...document.querySelectorAll('input[type="radio"]')]

		expect(radios.some((radio) => radio instanceof HTMLInputElement && radio.checked)).toBe(
			false,
		)
		expect(radios).not.toContain(document.activeElement)
		expect(page.getByRole('radiogroup', { name: 'Доставка', exact: true }).query()).toBe(
			find('.so-radio-group'),
		)
	})
})

/**
 * Видимая часть контрола — её центр ровняется по первой строке подписи. У
 * поля ввода, выбора и даты это коробка поля: текст стоит по её центру.
 */
const CONTROLS: ReadonlyArray<readonly [string, (size: TComponentSize) => VNode, string]> = [
	['Input', (size) => h(Input, { size }), '.so-input'],
	['Select', (size) => h(Select, { size }), '.so-select__field'],
	['DateInput', (size) => h(DateInput, { size }), '.so-date-input'],
	['DatePicker', (size) => h(DatePicker, { size }), '.so-date-picker__field'],
	['CheckBox', (size) => h(CheckBox, { size }), '.so-check-box__container'],
	['Switch', (size) => h(Switch, { size }), '.so-switch__track'],
	['Rating', (size) => h(Rating, { size }), '.so-rating__track'],
]

describe.each(CONTROLS)('%s: подпись сбоку', (_name, control, box) => {
	it('первая строка подписи — по центру контрола на любом размере', async () => {
		for (const size of SIZES) {
			await show(() =>
				h(Field, { label: LONG_LABEL, position: 'start', size }, () => control(size)),
			)

			const rows = lines()

			expect(rows.length, `${size}: подпись в несколько строк`).toBeGreaterThan(1)
			expect(
				Math.abs(middle(rows[0]) - middle(rect(box))),
				`${size}: центр первой строки и контрола`,
			).toBeLessThanOrEqual(1)

			cleanup()
		}
	})
})

/**
 * Многострочное поле выше своей первой строки: подпись сбоку ровняется не по
 * центру коробки, а по первой строке текста — там, где она у Input того же
 * размера, сколько бы строк ни было ниже и есть ли под полем счётчик.
 */
describe('Textarea: подпись сбоку', () => {
	it('первая строка подписи — по центру первой строки поля на любом размере', async () => {
		for (const size of SIZES) {
			await show(() =>
				h(Field, { label: LONG_LABEL, position: 'start', size }, () =>
					h(Textarea, { size, rows: 3, counter: true }),
				),
			)

			const rows = lines()
			const field = find('.so-textarea textarea')
			const style = getComputedStyle(field)
			const first =
				field.getBoundingClientRect().top +
				parseFloat(style.borderTopWidth) +
				parseFloat(style.paddingTop) +
				parseFloat(style.lineHeight) / 2

			expect(rows.length, `${size}: подпись в несколько строк`).toBeGreaterThan(1)
			expect(
				Math.abs(middle(rows[0]) - first),
				`${size}: центр первой строки подписи и поля`,
			).toBeLessThanOrEqual(1)

			cleanup()
		}
	})
})

describe('колонки', () => {
	/** Места частей от угла поля: так раскладки сравниваются и в разных местах страницы. */
	function places(): Record<string, [number, number, number, number]> {
		const root = rect('.so-field')
		const place = (selector: string): [number, number, number, number] => {
			const { left, top, width, height } = rect(selector)

			return [left - root.left, top - root.top, width, height]
		}

		return {
			label: place('.so-field__label'),
			control: place('.so-field__control'),
			helper: place('.so-field__helper'),
		}
	}

	const field = (props: Record<string, unknown>) => () =>
		h(Field, { label: 'Почта', helper: 'Не покажем никому', ...props }, () => h(Input))

	it('одна колонка — подпись над контролом, как у top, пиксель в пиксель', async () => {
		await show(field({ position: 'top' }))

		const top = places()

		cleanup()

		await show(field({ position: 'start', style: '--so-field-columns: minmax(0, 1fr)' }))

		const single = places()

		for (const part of ['label', 'control', 'helper'] as const) {
			single[part].forEach((value, index) => {
				expect(Math.abs(value - top[part][index]), part).toBeLessThanOrEqual(0.5)
			})
		}
	})

	it('start: подпись — слева от контрола, справка — под колонкой контрола', async () => {
		await show(field({ position: 'start' }))

		const label = rect('.so-field__label')
		const control = rect('.so-field__control')
		const helper = rect('.so-field__helper')

		expect(label.right).toBeLessThanOrEqual(control.left)
		expect(Math.abs(helper.left - control.left)).toBeLessThanOrEqual(0.5)
		expect(helper.top).toBeGreaterThanOrEqual(control.bottom)
	})

	it('start: длинная подпись — справка у контрола, а не под подписью', async () => {
		await show(field({ position: 'start', label: LONG_LABEL }), 280)

		const label = rect('.so-field__label')
		const control = rect('.so-field__control')
		const helper = rect('.so-field__helper')

		expect(label.bottom, 'подпись выше контрола').toBeGreaterThan(control.bottom)
		expect(helper.top).toBeLessThan(label.bottom)
		expect(Math.abs(helper.left - control.left)).toBeLessThanOrEqual(0.5)
	})
})

describe('ошибка', () => {
	it('встаёт на место подсказки, а контрол красится ошибкой', async () => {
		await show(() =>
			h(
				Field,
				{ label: 'Почта', helper: 'Не покажем никому', error: 'Нет @', invalid: true },
				() => h(Input),
			),
		)

		const input = find('.so-input input')

		expect(document.querySelector('.so-field__helper')).toBeNull()
		expect(find('.so-input').dataset.invalid).toBe('true')
		expect(input.getAttribute('aria-invalid')).toBe('true')
		expect(input.getAttribute('aria-describedby')).toBe(find('.so-field__error').id)
	})
})

describe('режим принудительных цветов', () => {
	afterEach(async () => {
		await forcedColors('none')
	})

	/** Толщина рамки видимой части контрола в поле — с ошибкой и без. */
	async function borders(control: () => VNode, part: string): Promise<[string, string]> {
		await show(() => h(Field, { label: 'Подпись' }, control))

		const valid = getComputedStyle(find(part)).borderTopWidth

		cleanup()

		await show(() => h(Field, { label: 'Подпись', error: 'Ошибка', invalid: true }, control))

		const invalid = getComputedStyle(find(part)).borderTopWidth

		return [valid, invalid]
	}

	it.each([
		['поле ввода', () => h(Input), '.so-input'],
		['флажок', () => h(CheckBox), '.so-check-box__container'],
	] as const)('%s: ошибку от покоя отличает толщина рамки', async (_name, control, part) => {
		await forcedColors('active')

		const [valid, invalid] = await borders(control, part)

		expect(valid).toBe('1px')
		expect(invalid).toBe('2px')
	})

	/**
	 * Точка обязательного поля — фон, а фон браузер в этом режиме заменяет
	 * цветом страницы: у контролов точка пропадала, и обязательное поле было
	 * не отличить от прочих. Точка стоит у подписи, а без подписи — у самого
	 * контрола, у каждого на своём узле (`themes/oren/src/mixins/_required.scss`).
	 * Цвета точки спек не знает: видна — значит отходит от страницы не меньше
	 * порога графики по WCAG (1.4.11).
	 */
	const DOTS: readonly { name: string; label?: string; control: () => VNode; host: string }[] = [
		{
			name: 'у подписи',
			label: 'Подпись',
			control: () => h(Input, { required: true }),
			host: '.so-field__label',
		},
		{
			name: 'у поля ввода без подписи',
			control: () => h(Input, { required: true }),
			host: '.so-input',
		},
		{
			name: 'у флажка без подписи',
			control: () => h(CheckBox, { required: true }),
			host: '.so-check-box__container',
		},
		{
			name: 'у переключателя без подписи',
			control: () => h(Switch, { required: true }),
			host: '.so-switch',
		},
	]

	it.each(DOTS)('точка обязательного поля $name видна', async ({ label, control, host }) => {
		await forcedColors('active')
		await show(() => h(Field, { label }, control))

		const dot = style(find(host), '::after')

		expect(dot.content, 'точка нарисована').not.toBe('none')
		expect(dot.display, 'точка не скрыта').not.toBe('none')
		expect(
			contrast(dot.backgroundColor, [systemColor('Canvas')]),
			'контраст точки к странице',
		).toBeGreaterThanOrEqual(3)
	})
})
