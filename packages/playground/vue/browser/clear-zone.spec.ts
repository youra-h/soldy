/**
 * Зона нажатия кнопки очистки полей на `sm`.
 *
 * Строка слота поля на `sm` — 20px, и кнопка очистки — квадрат в неё
 * (`clear-button.ts`), меньше минимума цели указателя по WCAG 2.5.8 (24×24).
 * Исключение по отступу её не спасает: вплотную к ней стоит ввод. Цель
 * добирает тема — невидимой зоной 24×24 по центру кнопки (`field-button-zone`
 * в `themes/oren/src/components/input/_mixins.scss`): нажатие по зоне —
 * нажатие по кнопке, а сама кнопка выглядит по-прежнему. Зона — у очистки
 * всей семьи полей: Input, DateInput, NumberInput, Select (очистку рисует его
 * поле — Input) и DatePicker в обоих режимах — у него очистка своя, не поля.
 *
 * У каждого поля, слева направо и справа налево: зона — квадрат 24×24 по
 * центру кнопки, нажатие ловят и её углы, на ввод она заходит не дальше, чем
 * выходит за кнопку, а соседнюю кнопку не задевает. И настоящим нажатием мыши:
 * за краем кнопки со стороны ввода оно очищает поле, а у края соседней кнопки
 * достаётся ей, и поле остаётся со значением. Соседняя кнопка — та, что стоит
 * в поле за очисткой: кнопка потребителя в слоте `trailing`, кнопка шага
 * «меньше» у NumberInput, стрелка Select и кнопка календаря DatePicker.
 *
 * Проверен поломкой. Без зоны падают проверки зоны и нажатие за краем кнопки у
 * всех полей. С зоной вдвое больше падают проверки зоны у всех, а нажатие у
 * соседа — там, где сосед не позиционирован (кнопка в `trailing`, стрелка
 * Select): зона лежит поверх него. Кнопка-сосед — Button, она `relative` и
 * позже в дереве, поэтому лежит над зоной сама, и её край ловит одна проверка
 * зоны.
 *
 * Ни раскладки, ни попадания по точке у jsdom нет — поэтому спек браузерный.
 * Форму самой кнопки сторожат спеки полей, зоны кнопок шага NumberInput —
 * `number-input.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { DateInput, DatePicker, Input, NumberInput, Select, SelectItem } from '@soldy-ui/vue'

import { find } from './colors'
import { sidesOf, type TLine } from './directions'
import { pseudoBox } from './pseudo-box'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Минимум цели указателя по WCAG 2.5.8 (AA), px — число стандарта, а не темы. */
const MIN_TARGET = 24

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Кнопка потребителя в слоте `trailing` — сосед очистки у Input и DateInput. */
const NEXT = 'so-test-next'

const nextButton = (): VNode =>
	h('button', {
		type: 'button',
		class: NEXT,
		'aria-label': 'Дальше',
		style: 'inline-size: 20px; block-size: 20px; padding: 0',
	})

/** Значение поля ввода по селектору. */
function valueOf(selector: string): string {
	const element = find(selector)

	if (!(element instanceof HTMLInputElement)) throw new Error(`${selector}: не <input>`)

	return element.value
}

/** Дата пуста: все её части на странице показывают подсказку. */
const datesEmpty = (): boolean =>
	[...document.querySelectorAll<HTMLElement>('.so-date-input__segment')].every(
		(part) => part.dataset.placeholder === 'true',
	)

type TFieldCase = {
	/** Поле — в заголовке теста */
	name: string
	/** Поле на `sm` со значением и кнопкой очистки */
	field: () => VNode
	/** Кнопка очистки */
	clear: string
	/** Ввод у начала кнопки: поле ввода, ряд частей даты или поле конца периода */
	input: string
	/** Соседняя кнопка — за очисткой, к концу строки */
	next: string
	/** Значение поля пусто */
	empty: () => boolean
}

const CASES: readonly TFieldCase[] = [
	{
		name: 'Input',
		field: () =>
			h(
				Input,
				{ size: 'sm', value: 'текст', clearable: true },
				{ trailing: () => nextButton() },
			),
		clear: '.so-input__clear',
		input: '.so-input > input',
		next: `.${NEXT}`,
		empty: () => valueOf('.so-input > input') === '',
	},
	{
		name: 'DateInput',
		field: () =>
			h(
				DateInput,
				{ size: 'sm', value: '2026-05-12', clearable: true, aria_label: 'Дата' },
				{ trailing: () => nextButton() },
			),
		clear: '.so-date-input__clear',
		input: '.so-date-input__segments',
		next: `.${NEXT}`,
		empty: datesEmpty,
	},
	{
		name: 'NumberInput',
		field: () =>
			h(NumberInput, { size: 'sm', value: 5, clearable: true, aria_label: 'Количество' }),
		clear: '.so-number-input__clear',
		input: '.so-number-input__input',
		next: '.so-number-input__decrement',
		empty: () => valueOf('.so-number-input__input') === '',
	},
	{
		name: 'Select',
		field: () =>
			h(
				Select,
				{ size: 'sm', value: '0', clearable: true },
				{
					default: () =>
						['Москва', 'Тверь'].map((text, index) =>
							h(SelectItem, { key: text, value: String(index), text }),
						),
				},
			),
		clear: '.so-select__field .so-input__clear',
		input: '.so-select__field > input',
		next: '.so-select__arrow',
		empty: () => valueOf('.so-select__field > input') === '',
	},
	{
		name: 'DatePicker, одна дата',
		field: () =>
			h(DatePicker, {
				size: 'sm',
				value: '2026-05-12',
				clearable: true,
				aria_label: 'Дата заезда',
			}),
		clear: '.so-date-picker__clear',
		input: '.so-date-picker__field > .so-date-input__segments',
		next: '.so-date-picker__trigger',
		empty: datesEmpty,
	},
	{
		name: 'DatePicker, диапазон',
		field: () =>
			h(DatePicker, {
				size: 'sm',
				mode: 'range',
				value: ['2026-05-12', '2026-05-20'],
				clearable: true,
				aria_label: 'Даты поездки',
			}),
		clear: '.so-date-picker__clear',
		input: '.so-date-picker__end',
		next: '.so-date-picker__trigger',
		empty: datesEmpty,
	},
]

/** Поле в сцене заданного направления; узел корня плагины получают кадром позже. */
async function show(field: () => VNode, dir: TLine): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { dir, style: 'padding: 24px; width: 360px' }, [field()]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Пересекаются ли две коробки площадью, а не краем. */
const overlap = (a: DOMRect, b: DOMRect): boolean =>
	a.left < b.right - EPSILON &&
	b.left < a.right - EPSILON &&
	a.top < b.bottom - EPSILON &&
	b.top < a.bottom - EPSILON

/** На сколько коробка заходит на другую вдоль строки. */
const inlineOverlap = (a: DOMRect, b: DOMRect): number =>
	Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))

/**
 * Нажатие в точке достаётся узлу: то, что в точке, лежит в нём.
 *
 * Точку Blink проверяет квадратом 1×1 вправо и вниз от неё
 * (`HitTestLocation`), поэтому квадрат ставится центром в точку, как в
 * `tags-close.spec.ts`: точка в углу зоны задевает её на полпикселя.
 */
const lands = (target: Element, x: number, y: number): boolean => {
	const hit = document.elementFromPoint(x - 0.5, y - 0.5)

	return hit !== null && target.contains(hit)
}

/**
 * Нажать мышью в точку страницы. Наводится на `body`: точка лежит и вне
 * кнопки, и нажатие на саму кнопку там Playwright не принял бы.
 */
async function pressAt(x: number, y: number): Promise<void> {
	const body = document.body.getBoundingClientRect()

	await userEvent.click(document.body, { position: { x: x - body.left, y: y - body.top } })
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each<TLine>(['ltr', 'rtl'])('%s', (dir) => {
	/** Сторона экрана, где начало строки. */
	const { start } = sidesOf(dir)

	/** Шаг вдоль строки к её концу, в пикселях экрана. */
	const forward = dir === 'ltr' ? 1 : -1

	describe.each(CASES)('$name', ({ field, clear, input, next, empty }) => {
		it('зона — 24×24 по центру кнопки, углы ловят нажатие, на ввод заходит на свой выступ, соседа не задевает', async () => {
			await show(field, dir)

			const button = find(clear)
			const own = button.getBoundingClientRect()
			const zone = pseudoBox(button, '::before')
			const overhang = (MIN_TARGET - own.width) / 2

			expect(overhang, 'кнопка на sm меньше минимума цели').toBeGreaterThan(0)
			expect(zone.width, 'ширина зоны').toBeCloseTo(MIN_TARGET, 0)
			expect(zone.height, 'высота зоны').toBeCloseTo(MIN_TARGET, 0)
			expect(
				Math.abs(zone.left + zone.right - own.left - own.right) / 2,
				'зона по центру кнопки вдоль строки',
			).toBeLessThan(EPSILON)
			expect(
				Math.abs(zone.top + zone.bottom - own.top - own.bottom) / 2,
				'зона по центру кнопки поперёк строки',
			).toBeLessThan(EPSILON)

			const corners = {
				'левый верхний': [zone.left, zone.top],
				'правый верхний': [zone.right, zone.top],
				'левый нижний': [zone.left, zone.bottom],
				'правый нижний': [zone.right, zone.bottom],
			}

			for (const [corner, [x, y]] of Object.entries(corners)) {
				expect(lands(button, x, y), `угол зоны: ${corner}`).toBe(true)
			}

			expect(
				inlineOverlap(zone, find(input).getBoundingClientRect()),
				'на ввод — не дальше выступа за кнопку',
			).toBeLessThanOrEqual(overhang + EPSILON)
			expect(overlap(zone, find(next).getBoundingClientRect()), 'соседняя кнопка').toBe(false)
		})

		it('нажатие за краем кнопки со стороны ввода очищает поле', async () => {
			await show(field, dir)
			await expect.poll(empty).toBe(false)

			const own = find(clear).getBoundingClientRect()
			const overhang = (MIN_TARGET - own.width) / 2

			// Середина выступа зоны над вводом: за краем кнопки, но не за краем зоны
			await pressAt(own[start] - (forward * overhang) / 2, (own.top + own.bottom) / 2)

			await expect.poll(empty).toBe(true)
		})

		it('нажатие у края соседней кнопки достаётся ей, поле не очищается', async () => {
			await show(field, dir)
			await expect.poll(empty).toBe(false)

			const neighbour = find(next)
			const box = neighbour.getBoundingClientRect()
			let pressed = false

			neighbour.addEventListener('pointerdown', () => {
				pressed = true
			})

			// Пиксель внутрь соседа от его края со стороны очистки
			await pressAt(box[start] + forward, (box.top + box.bottom) / 2)
			// Очистка, перехвати она нажатие, дошла бы до разметки кадром позже
			await nextFrame()

			expect(pressed, 'нажатие у соседа').toBe(true)
			expect(empty(), 'поле со значением').toBe(false)
		})
	})
})
