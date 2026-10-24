/**
 * Общий слой тем без темы — ползунок, оценка, лента, индикаторы, заглушка и
 * пагинация: страница только с CSS базы (`@soldy-ui/theme-base`), без
 * `@soldy-ui/theme-oren`.
 *
 * Структура этих частей — раскладка и механика — лежит в базе, а облик в теме
 * (`packages/themes/base/AGENTS.md`, «Перенос структуры»). Без темы части
 * голые — без цвета, рельса и звёзд цвета темы, — но рабочие, и здесь это
 * проверяется тем, что видит пользователь, а не числами базы: ручки Slider
 * стоят на концах хода при `min` и `max`, а нажатие в точку хода ставит
 * значение там — по горизонтали, в RTL и по вертикали; нажатие на звезду
 * Rating ставит её номер; лента Scroller в покое стоит в начале строки, а
 * после листания — на начале элемента; заливка ProgressLinear — доля дорожки
 * от начала строки; заглушка Skeleton закрывает содержимое; клетки Pagination —
 * высотой с Button того же размера, а номера в две цифры — квадраты. Спеки с
 * темой держат базу под темой, и потерянное ею правило тема могла бы закрыть
 * своим, а сторожа CSS (`themes/base/__tests__/`) раскладки не считают.
 *
 * Страница у файла спека своя (`isolate` прогона), и листа темы на ней нет —
 * это проверяет первый тест. Проверен поломкой: без отступа корня Slider
 * вдоль оси (`padding-inline` у `.so-slider--horizontal`) ручки на краях хода
 * свисают за коробку ползунка, и падают случаи краёв хода; со сдвинутым ходом
 * (без поля ручки назад на полстороны) падают и края, и нажатие в точку хода
 * во всех трёх случаях; без запаса под кольцо фокуса в окне снапа ленты снап
 * сдвигает её в покое на этот запас, и падает лента; без ряда звёзд — оценка;
 * без поля строки страницы — клетки Pagination.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { TRating, TSlider } from '@soldy-ui/core'
import type { IRatingProps, ISliderProps, TComponentSize } from '@soldy-ui/core'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import {
	Button,
	Pagination,
	ProgressLinear,
	Rating,
	Scroller,
	Skeleton,
	Slider,
} from '@soldy-ui/vue'

import '@soldy-ui/theme-base'

/** Допуск на субпиксельное округление координат, px. */
const EPSILON = 0.5

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Разметка на странице и кадры: узлы плагины получают по `ready`, кадром. */
async function show(content: () => VNode | VNode[], dir?: 'ltr' | 'rtl'): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { dir, style: 'padding: 24px; width: 400px' }, content()),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]

const box = (element: Element) => element.getBoundingClientRect()

/** Центр узла на экране. */
const center = (element: Element) => {
	const { left, top, width, height } = box(element)

	return { x: left + width / 2, y: top + height / 2 }
}

afterEach(() => {
	cleanup()
})

describe('страница — только общий слой тем', () => {
	it('переменные базы на месте, токенов темы нет', () => {
		const root = getComputedStyle(document.documentElement)

		expect(root.getPropertyValue('--so-slider-thumb-size-normal')).not.toBe('')
		expect(root.getPropertyValue('--so-rating-star-size-normal')).not.toBe('')
		expect(root.getPropertyValue('--so-component-text')).toBe('')
		expect(root.getPropertyValue('--so-neutral-500')).toBe('')
	})
})

describe('Slider — ход ручек', () => {
	type TCase = {
		name: string
		orientation: 'horizontal' | 'vertical'
		dir: 'ltr' | 'rtl'
		/** Точка хода на экране по доле значения: 0 — `min`, 1 — `max`. */
		point: (track: DOMRect, fraction: number) => { x: number; y: number }
	}

	/**
	 * Ход растёт к концу строки — в RTL справа налево, — а у вертикального
	 * снизу вверх. Поперёк оси — середина дорожки.
	 */
	const CASES: readonly TCase[] = [
		{
			name: 'горизонтальный',
			orientation: 'horizontal',
			dir: 'ltr',
			point: (track, fraction) => ({
				x: track.left + track.width * fraction,
				y: track.top + track.height / 2,
			}),
		},
		{
			name: 'горизонтальный, RTL',
			orientation: 'horizontal',
			dir: 'rtl',
			point: (track, fraction) => ({
				x: track.right - track.width * fraction,
				y: track.top + track.height / 2,
			}),
		},
		{
			name: 'вертикальный',
			orientation: 'vertical',
			dir: 'ltr',
			point: (track, fraction) => ({
				x: track.left + track.width / 2,
				y: track.bottom - track.height * fraction,
			}),
		},
	]

	/** Ползунок на странице. Значение держит экземпляр ядра: по нему тест читает результат. */
	async function mount(props: Partial<ISliderProps>, dir: 'ltr' | 'rtl'): Promise<TSlider> {
		const ctrl = new TSlider(props)

		await show(() => h(Slider, { ctrl }), dir)

		return ctrl
	}

	it.each(CASES)('$name: при min и max ручки — на концах хода', async (scenario) => {
		await mount({ value: [0, 100], orientation: scenario.orientation }, scenario.dir)

		const track = box(find('.so-slider__track'))
		const root = box(find('.so-slider'))
		const [low, high] = all('.so-slider__thumb')

		for (const [thumb, fraction] of [
			[low, 0],
			[high, 1],
		] as const) {
			const at = center(thumb)
			const end = scenario.point(track, fraction)

			expect(Math.abs(at.x - end.x), `ручка ${fraction}: по строке`).toBeLessThanOrEqual(
				EPSILON,
			)
			expect(Math.abs(at.y - end.y), `ручка ${fraction}: поперёк`).toBeLessThanOrEqual(
				EPSILON,
			)

			// Ручка на краю хода — в коробке ползунка: место под полстороны
			// держит корень
			const knob = box(thumb)

			expect(knob.left, `ручка ${fraction} в коробке`).toBeGreaterThanOrEqual(
				root.left - EPSILON,
			)
			expect(knob.right, `ручка ${fraction} в коробке`).toBeLessThanOrEqual(
				root.right + EPSILON,
			)
			expect(knob.top, `ручка ${fraction} в коробке`).toBeGreaterThanOrEqual(
				root.top - EPSILON,
			)
			expect(knob.bottom, `ручка ${fraction} в коробке`).toBeLessThanOrEqual(
				root.bottom + EPSILON,
			)
		}
	})

	it.each(CASES)('$name: нажатие в точку хода ставит значение там', async (scenario) => {
		const ctrl = await mount({ value: 0, orientation: scenario.orientation }, scenario.dir)

		const track = box(find('.so-slider__track'))
		const target = scenario.point(track, 0.3)

		await userEvent.click(find('.so-slider__track'), {
			position: { x: target.x - track.left, y: target.y - track.top },
		})

		expect(ctrl.value).toBe(30)

		// Ручка встала туда, куда нажали
		const at = center(find('.so-slider__thumb'))

		expect(Math.abs(at.x - target.x)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(at.y - target.y)).toBeLessThanOrEqual(EPSILON)
	})
})

describe('Rating — нажатие на звезду', () => {
	/** Оценка на странице. Значение держит экземпляр ядра: по нему тест читает результат. */
	async function mount(props: Partial<IRatingProps>, dir: 'ltr' | 'rtl'): Promise<TRating> {
		const ctrl = new TRating(props)

		await show(() => h(Rating, { ctrl }), dir)

		return ctrl
	}

	it.each(['ltr', 'rtl'] as const)('%s: N-я звезда ставит N', async (dir) => {
		const ctrl = await mount({ value: 0 }, dir)
		const stars = all('.so-rating__star')

		expect(stars).toHaveLength(5)

		// Звёзды — в строку по её направлению: в RTL первая — справа
		for (let index = 1; index < stars.length; index++) {
			const [prev, next] = [box(stars[index - 1]), box(stars[index])]

			expect(dir === 'ltr' ? next.left : prev.left).toBeGreaterThanOrEqual(
				(dir === 'ltr' ? prev.right : next.right) - EPSILON,
			)
		}

		for (const [index, star] of stars.entries()) {
			await userEvent.click(star)

			expect(ctrl.value, `звезда ${index + 1}`).toBe(index + 1)
		}
	})
})

describe('Scroller — лента встаёт на начало элемента', () => {
	/** Элементов заведомо больше, чем помещается в узкой ленте. */
	const ITEMS = ['Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый', 'Шестой']

	const strip = () =>
		h('div', { style: 'width: 260px' }, [
			h(Scroller, null, () =>
				ITEMS.map((text) =>
					h(
						'span',
						{
							key: text,
							class: 'so-test-item',
							style: 'padding: 4px 12px; white-space: nowrap',
						},
						text,
					),
				),
			),
		])

	const viewport = () => find('.so-scroller__viewport')
	const items = () => all('.so-test-item')

	/**
	 * Начало окна снапа на экране: паддинг-бокс вьюпорта, вдвинутый отступом
	 * прокрутки, — в RTL у правого края.
	 */
	function windowStart(dir: 'ltr' | 'rtl'): number {
		const style = getComputedStyle(viewport())
		const outer = box(viewport())

		return dir === 'ltr'
			? outer.left + parseFloat(style.borderLeftWidth) + parseFloat(style.scrollPaddingLeft)
			: outer.right -
					parseFloat(style.borderRightWidth) -
					parseFloat(style.scrollPaddingRight)
	}

	/** Где у элемента начало строки: в RTL — правый край. */
	const startOf = (element: Element, dir: 'ltr' | 'rtl') =>
		dir === 'ltr' ? box(element).left : box(element).right

	it.each(['ltr', 'rtl'] as const)(
		'%s: в покое — в начале строки, после «вперёд» — на начале элемента',
		async (dir) => {
			await show(strip, dir)
			await expect.poll(() => find('.so-scroller').dataset.canNext).toBe('true')

			// В покое лента у начала прокрутки: «назад» выключена, первый элемент
			// — у начала окна
			expect(viewport().scrollLeft, 'в покое').toBe(0)
			expect(find('.so-scroller').dataset.canPrev).toBe('false')
			expect(Math.abs(startOf(items()[0], dir) - windowStart(dir))).toBeLessThanOrEqual(
				EPSILON,
			)

			const scrolled = new Promise((resolve) =>
				viewport().addEventListener('scrollend', resolve, { once: true }),
			)

			await userEvent.click(find('.so-scroller__next'))
			await scrolled

			expect(Math.abs(viewport().scrollLeft), 'лента сдвинулась').toBeGreaterThan(0)

			// Начало одного из элементов — ровно в начале окна: страница встала
			// на границу элемента, а не посреди него
			const offsets = items().map((item) => Math.abs(startOf(item, dir) - windowStart(dir)))

			expect(Math.min(...offsets)).toBeLessThanOrEqual(1)
		},
	)
})

describe('ProgressLinear — заливка от начала строки', () => {
	it.each(['ltr', 'rtl'] as const)('%s: доля 40 % — две пятых дорожки', async (dir) => {
		await show(() => h(ProgressLinear, { value: 40 }), dir)

		const track = box(find('.so-progress-linear'))
		const fill = box(find('.so-progress-linear__range'))

		expect(track.height).toBeGreaterThan(0)
		expect(Math.abs(fill.width - track.width * 0.4)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(fill.height - track.height)).toBeLessThanOrEqual(EPSILON)
		expect(
			Math.abs(dir === 'ltr' ? fill.left - track.left : track.right - fill.right),
			'у начала строки',
		).toBeLessThanOrEqual(EPSILON)
	})
})

describe('Skeleton — заглушка закрывает содержимое', () => {
	it('во весь корень, а содержимое под ней не видно', async () => {
		await show(() =>
			h(Skeleton, { width: 120, height: 16 }, () =>
				h('span', { class: 'so-test-content' }, 'Текст'),
			),
		)

		const root = box(find('.so-skeleton'))
		const placeholder = box(find('.so-skeleton__placeholder'))

		expect(root.width).toBeGreaterThan(0)
		expect(root.height).toBeGreaterThan(0)

		for (const side of ['left', 'top', 'right', 'bottom'] as const) {
			expect(Math.abs(placeholder[side] - root[side]), side).toBeLessThanOrEqual(EPSILON)
		}

		expect(getComputedStyle(find('.so-test-content')).opacity).toBe('0')
	})
})

describe('Pagination — клетка по шкале Button', () => {
	it.each(COMPONENT_SIZES)(
		'%s: клетки — высотой с Button, номера в две цифры — квадраты',
		async (size: TComponentSize) => {
			await show(() => [
				h(Pagination, { size, total: 990, value: 50 }),
				h(Button, { size, text: 'Кнопка', class: 'so-test-button' }),
			])

			const cell = box(find('.so-test-button')).height
			const pages = all('.so-pagination-item > .so-button')

			expect(pages.map((page) => page.textContent?.trim())).toEqual([
				'1',
				'49',
				'50',
				'51',
				'99',
			])

			for (const page of pages) {
				expect(
					Math.abs(box(page).height - cell),
					page.textContent ?? '',
				).toBeLessThanOrEqual(EPSILON)
				expect(
					Math.abs(box(page).width - cell),
					page.textContent ?? '',
				).toBeLessThanOrEqual(EPSILON)
			}

			for (const part of [
				find('.so-pagination__prev'),
				find('.so-pagination__next'),
				...all('.so-pagination__ellipsis'),
			]) {
				expect(Math.abs(box(part).width - cell), part.className).toBeLessThanOrEqual(
					EPSILON,
				)
				expect(Math.abs(box(part).height - cell), part.className).toBeLessThanOrEqual(
					EPSILON,
				)
			}

			// Ряд — одна строка
			const tops = [
				find('.so-pagination__prev'),
				...all('.so-pagination__list > li'),
				find('.so-pagination__next'),
			].map((part) => Math.round(box(part).top))

			expect(new Set(tops).size).toBe(1)
		},
	)
})
