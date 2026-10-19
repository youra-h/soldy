/**
 * Поле числа в настоящем браузере: настоящий ввод, удержание кнопки шага и
 * раскладка коробки.
 *
 * jsdom не выполняет действий браузера — не вставляет набранный знак, не
 * двигает каретку и не отправляет форму по Enter, — и не считает раскладку.
 * Поэтому набор здесь — клавишами Playwright (`userEvent.keyboard`):
 * погашенная до правки буква не встаёт в поле и не сдвигает каретку, а
 * удержание кнопки — командами `mouseDown` и `mouseUp`, с паузой при зажатой
 * кнопке, которой `userEvent` не умеет.
 *
 * Раскладка: на всех размерах коробка поля числа — той же высоты, что у Input,
 * и число начинается там же, где текст Input; зоны нажатия кнопок шага на `sm`
 * (24×24 по WCAG 2.5.8) сходятся встык, не перекрываясь; в RTL ряд кнопок —
 * зеркало, а направление числа — его локали, а не поля.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import { defineComponent, h, type VNode } from 'vue'
import { TNumberInput } from '@soldy-ui/core'
import type { INumberInputProps, TComponentSize } from '@soldy-ui/core'
import { ruRU } from '@soldy-ui/plugins'
import { Field, Input, LocaleProvider, NumberInput } from '@soldy-ui/vue'

import { expectClearSquare } from './clear-button'
import { find } from './colors'
import { pseudoBox } from './pseudo-box'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const SIZES: readonly TComponentSize[] = ['sm', 'normal', 'lg', 'xl', '2xl']

/** Смонтировать разметку и дождаться кадра плагинов. */
async function show(content: () => VNode, dir: 'ltr' | 'rtl' = 'ltr'): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { dir, style: 'padding: 24px; width: 320px' }, [content()]),
		}),
	)

	await nextFrame()
	await nextFrame()
}

/** Поле числа на русской локали; значение и события держит экземпляр ядра. */
async function mount(props: Partial<INumberInputProps> = {}): Promise<TNumberInput> {
	const ctrl = new TNumberInput(props)

	await show(() =>
		h(LocaleProvider, { locale: ruRU }, () => [
			h(NumberInput, { ctrl, aria_label: 'Количество' }),
			h('button', { class: 'so-test-after' }, 'После'),
		]),
	)

	return ctrl
}

function input(): HTMLInputElement {
	const node = document.querySelector('.so-number-input__input')

	if (!(node instanceof HTMLInputElement)) throw new Error('ввода нет')

	return node
}

const rect = (selector: string): DOMRect => find(selector).getBoundingClientRect()

/** Начало текста ввода от левого края коробки: рамка, поле и отступ строки. */
function textStart(field: HTMLInputElement, box: Element): number {
	const style = getComputedStyle(field)

	return (
		field.getBoundingClientRect().left +
		parseFloat(style.borderLeftWidth) +
		parseFloat(style.paddingLeft) +
		parseFloat(style.textIndent) -
		box.getBoundingClientRect().left
	)
}

/** Пересекаются ли две коробки площадью, а не краем. */
const overlap = (a: DOMRect, b: DOMRect): boolean =>
	a.left < b.right - 0.5 &&
	b.left < a.right - 0.5 &&
	a.top < b.bottom - 0.5 &&
	b.top < a.bottom - 0.5

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(async () => {
	await commands.mouseUp().catch(() => undefined)
	cleanup()
})

describe('набор', () => {
	it('ru-RU: число набирают по-русски, уход фокуса — строка формата', async () => {
		const ctrl = await mount()

		await userEvent.click(input())
		await userEvent.keyboard('1234,5')

		expect(input().value).toBe('1234,5')
		expect(ctrl.value).toBe(1234.5)

		await userEvent.tab()

		expect(input().value).toBe(new Intl.NumberFormat('ru-RU').format(1234.5))
	})

	it('точка — тоже десятичный разделитель у ru-RU', async () => {
		const ctrl = await mount()

		await userEvent.click(input())
		await userEvent.keyboard('2.5')

		expect(ctrl.value).toBe(2.5)
	})

	it('буква и минус у поля без отрицательных не встают и каретку не двигают', async () => {
		const ctrl = await mount({ value: 12, min: 0 })
		const field = input()

		field.focus()
		field.setSelectionRange(1, 1)
		await userEvent.keyboard('a-')

		expect(field.value).toBe('12')
		expect([field.selectionStart, field.selectionEnd]).toEqual([1, 1])
		expect(ctrl.value).toBe(12)

		await userEvent.keyboard('5')

		expect(field.value).toBe('152')
		expect(field.selectionStart).toBe(2)
	})

	it('стрелка — шаг ядра, а не каретка', async () => {
		const ctrl = await mount({ value: 5, step: 0.5 })

		await userEvent.click(input())
		await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowDown}')

		expect(ctrl.value).toBe(5.5)
		expect(input().value).toBe(new Intl.NumberFormat('ru-RU').format(5.5))
	})
})

describe('кнопки шага', () => {
	it('удержание повторяет шаг до границы: data-pressed, пока держат, фокус — во вводе', async () => {
		const ctrl = await mount({ value: 0, max: 6 })
		const commits: unknown[] = []

		ctrl.events.on('commit', (payload) => commits.push(payload))

		const increment = find('.so-number-input__increment')

		await userEvent.hover(increment)
		await commands.mouseDown()

		try {
			expect(increment.getAttribute('data-pressed')).toBe('true')
			expect(document.activeElement).toBe(input())

			await expect.poll(() => ctrl.value, { timeout: 3000 }).toBe(6)
			// У края кнопка выключилась, и удержание кончилось само
			await expect.poll(() => increment.hasAttribute('data-pressed')).toBe(false)
			expect(increment.dataset.disabled).toBe('true')
		} finally {
			await commands.mouseUp()
		}

		expect(document.activeElement).toBe(input())
		expect(commits).toEqual([{ newValue: 6, oldValue: 0 }])
	})

	it('нажатие — один шаг, отпустили — повтора нет', async () => {
		const ctrl = await mount({ value: 3 })

		await userEvent.click(find('.so-number-input__decrement'))
		await new Promise((resolve) => setTimeout(resolve, 600))

		expect(ctrl.value).toBe(2)
		expect(document.activeElement).toBe(input())
	})
})

describe('в форме', () => {
	it('Enter отправляет форму с числом, а не с текстом поля', async () => {
		const sent: FormDataEntryValue[] = []
		const onSubmit = (event: Event) => {
			event.preventDefault()

			if (event.target instanceof HTMLFormElement) {
				const value = new FormData(event.target).get('price')

				if (value !== null) sent.push(value)
			}
		}

		await show(() =>
			h(LocaleProvider, { locale: ruRU }, () =>
				h('form', { onSubmit }, [
					h(NumberInput, {
						name: 'price',
						aria_label: 'Цена',
						formatOptions: { style: 'currency', currency: 'RUB' },
					}),
					h('button', { type: 'submit' }, 'Отправить'),
				]),
			),
		)

		await userEvent.click(input())
		await userEvent.keyboard('1234,56789{Enter}')

		expect(sent).toEqual(['1234.57'])
		expect(input().value).toBe(
			new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(1234.57),
		)
	})
})

describe('направление', () => {
	it('dir числа — его локали: ru-RU слева направо и в поле справа налево', async () => {
		await show(
			() => h(LocaleProvider, { locale: ruRU }, () => h(NumberInput, { value: 5 })),
			'rtl',
		)

		expect(input().getAttribute('dir')).toBe('ltr')
		expect(input().getAttribute('lang')).toBe('ru-RU')
	})

	it('he-IL с валютой — справа налево и в поле слева направо', async () => {
		await show(() =>
			h(LocaleProvider, { locale: { ...ruRU, tag: 'he-IL' } }, () =>
				h(NumberInput, { value: 5, formatOptions: { style: 'currency', currency: 'ILS' } }),
			),
		)

		expect(input().getAttribute('dir')).toBe('rtl')
	})

	it('в RTL ряд кнопок — зеркало: «больше» у левого края', async () => {
		await show(() => h(NumberInput, { value: 5 }), 'rtl')

		expect(rect('.so-number-input__increment').right).toBeLessThanOrEqual(
			rect('.so-number-input__decrement').left + 0.5,
		)
		expect(
			rect('.so-number-input__increment').left - rect('.so-number-input').left,
		).toBeLessThan(rect('.so-number-input').right - rect('.so-number-input__decrement').right)
	})
})

describe('раскладка', () => {
	it.each(SIZES)('%s: кнопки шага и очистка — квадраты в строку слота', async (size) => {
		await show(() => h(NumberInput, { size, value: 5, clearable: true }))

		const stepper = find('.so-number-input__stepper')

		expectClearSquare(find('.so-number-input__decrement'), stepper, `${size}: «меньше»`)
		expectClearSquare(find('.so-number-input__increment'), stepper, `${size}: «больше»`)
		expectClearSquare(
			find('.so-number-input__clear'),
			find('.so-number-input__trailing'),
			`${size}: очистка`,
		)
	})

	it('на sm зоны нажатия кнопок шага — 24×24, встык и мимо очистки и ввода', async () => {
		await show(() => h(NumberInput, { size: 'sm', value: 5, clearable: true }))

		const decrement = pseudoBox(find('.so-number-input__decrement'), '::before')
		const increment = pseudoBox(find('.so-number-input__increment'), '::before')

		for (const zone of [decrement, increment]) {
			expect(Math.round(zone.width)).toBe(24)
			expect(Math.round(zone.height)).toBe(24)
		}

		expect(overlap(decrement, increment)).toBe(false)
		expect(overlap(decrement, rect('.so-number-input__clear'))).toBe(false)
		expect(overlap(decrement, rect('.so-number-input__input'))).toBe(false)
	})

	it.each(SIZES)('%s: вровень с Input в Field — высота коробки и начало текста', async (size) => {
		await show(() =>
			h('div', [
				h(Field, { label: 'Текст', class: 'so-test-text' }, () => h(Input, { size })),
				h(Field, { label: 'Число', class: 'so-test-number' }, () =>
					h(NumberInput, { size, value: 5 }),
				),
			]),
		)

		const text = find('.so-test-text .so-input')
		const number = find('.so-test-number .so-number-input')
		const textField = text.querySelector('input')

		if (!(textField instanceof HTMLInputElement)) throw new Error('поля Input нет')

		expect(
			Math.abs(number.getBoundingClientRect().height - text.getBoundingClientRect().height),
		).toBeLessThanOrEqual(0.5)
		expect(
			Math.abs(textStart(input(), number) - textStart(textField, text)),
		).toBeLessThanOrEqual(0.5)
	})
})
