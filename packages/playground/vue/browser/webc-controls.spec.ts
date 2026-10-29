/**
 * Контролы и навигация Web Components в настоящем браузере:
 * `<span is="so-progress-linear">`, `<span is="so-slider">`,
 * `<span is="so-rating">`, `<nav is="so-pagination">` и
 * `<div is="so-scroller">`.
 *
 * Теме корень элемента Web Components — то же, что корень остальных
 * адаптеров: дорожка, заливка, метки, ручки и подсказки ползунка, звёзды и
 * ручка оценки, стрелки и страницы пагинации, кнопки и вьюпорт ленты стоят
 * так же, как у Vue, на тех же местах и тех же размеров. Ручку тянет
 * настоящий указатель, а стрелка на поле — ровно один шаг ядра: плагины те же,
 * что у Vue, а части они находят по классам и прямыми детьми. jsdom не
 * считает ни раскладки, ни действий браузера. Разметку и наборы ядра
 * сторожат `ui/webc/__tests__/progress-linear.spec.ts`, `slider.spec.ts`,
 * `rating.spec.ts`, `pagination.spec.ts` и `scroller.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { webkitUntil } from './engine'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Pagination, ProgressLinear, Rating, Scroller, Slider } from '@soldy-ui/vue'
import {
	TRatingElement,
	TSliderElement,
	type TRatingElementProps,
	type TSliderElementProps,
} from '@soldy-ui/webc'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Узел разметки Web Components теста — снимается после каждого. */
let stage: HTMLElement | null = null

/**
 * Разметка на странице, слушатели плагинов — на элементах. Плагины вешают их
 * по `ready` узла, а `TElementPlugin` объявляет узел через кадр. Свойства
 * элемента — до вставки: метки списком атрибутом не задать.
 */
async function show(html: string, props: Record<string, unknown> = {}): Promise<HTMLElement> {
	const node = document.createElement('div')

	node.innerHTML = html

	const element = node.querySelector('[is]')

	for (const [name, value] of Object.entries(props)) Reflect.set(element ?? node, name, value)

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

/**
 * Место узла в блоке — от его угла — и размер, в пикселях. Узел без коробки
 * (`display: none` — пустая подпись метки) места не имеет: его прямоугольник
 * нулевой и стоит в углу окна, а не блока.
 */
function placeIn(node: Element, block: Element) {
	if (node.getClientRects().length === 0) return { x: 0, y: 0, width: 0, height: 0 }

	const outer = block.getBoundingClientRect()
	const inner = node.getBoundingClientRect()

	return {
		x: Math.round(inner.left - outer.left),
		y: Math.round(inner.top - outer.top),
		width: Math.round(inner.width),
		height: Math.round(inner.height),
	}
}

/** Блок одной ширины для пары компонентов. */
const BOX = 'width: 400px; padding: 48px 24px 24px'

/**
 * Компонент Web Components и компонент Vue стоят рядом — в одинаковых блоках
 * одной ширины. Тема видит у них одни классы и одну разметку внутри корня, и
 * части встают на те же места.
 */
async function pair(
	vue: () => ReturnType<typeof h>,
	html: string,
	props: Record<string, unknown> = {},
): Promise<{ vue: HTMLElement; webc: HTMLElement }> {
	// Указатель остался там, где его бросил прошлый тест или спек, а часть под
	// ним наведением меняет коробку — звезда Rating поднимается масштабом:
	// уводим его в угол страницы, в отступ блока. Не `unhover`: тот ставит
	// указатель в центр `body`, а там встанет пара.
	await userEvent.hover(document.body, { position: { x: 0, y: 0 } })

	render(defineComponent({ render: () => h('div', { class: 'vue', style: BOX }, [vue()]) }))
	await nextTick()

	const root = await show(`<div class="webc" style="${BOX}">${html}</div>`, props)

	return {
		vue: find(document, '.vue', HTMLElement),
		webc: find(root, '.webc', HTMLElement),
	}
}

/**
 * Части одного селектора у обоих — по порядку, на тех же местах и тех же
 * размеров. Часть бывает и без коробки — пустую подпись метки тема прячет по
 * `:empty`, а метка нулевой протяжённости вдоль оси, — но хотя бы у одной есть
 * размер: сверка не впустую. Части — любые элементы, у значка звезды это
 * `<svg>`.
 */
function expectSameParts(blocks: { vue: HTMLElement; webc: HTMLElement }, part: string): void {
	const places = (block: HTMLElement) =>
		[...block.querySelectorAll(part)].map((node) => placeIn(node, block))
	const vue = places(blocks.vue)

	expect(vue.length, part).toBeGreaterThan(0)
	expect(
		vue.some(({ width, height }) => width > 0 || height > 0),
		part,
	).toBe(true)
	expect(places(blocks.webc), part).toEqual(vue)
}

describe('части стоят, как у Vue', () => {
	it.each(['horizontal', 'vertical'] as const)(
		'ProgressLinear %s: дорожка и заливка доли',
		async (orientation) => {
			const blocks = await pair(
				() => h(ProgressLinear, { value: 40, orientation }),
				`<span is="so-progress-linear" value="40" orientation="${orientation}"></span>`,
			)

			for (const part of ['.so-progress-linear', '.so-progress-linear__range']) {
				expectSameParts(blocks, part)
			}
		},
	)

	it('Slider: дорожка, заливка, метки с подписями, ручки, поля и подсказки', async () => {
		const marks = [{ value: 0, label: 'Мин' }, { value: 50 }, { value: 100, label: 'Макс' }]
		const blocks = await pair(
			() => h(Slider, { value: [20, 70], marks, tooltip: 'always' }),
			'<span is="so-slider" value="[20,70]" tooltip="always"></span>',
			{ marks },
		)

		for (const part of [
			'.so-slider',
			'.so-slider__track',
			'.so-slider__range',
			'.so-slider__mark',
			'.so-slider__mark-label',
			'.so-slider__thumb',
			'.so-slider__input',
			'.so-slider__tooltip',
		]) {
			expectSameParts(blocks, part)
		}
	})

	it('Rating: дорожка, звёзды со слоями заливки и ручка', async () => {
		const blocks = await pair(
			() => h(Rating, { value: 3.5, step: 0.5 }),
			'<span is="so-rating" value="3.5" step="0.5"></span>',
		)

		for (const part of [
			'.so-rating',
			'.so-rating__track',
			'.so-rating__star',
			'.so-rating__star-fill',
			'.so-rating__icon',
			'.so-rating__thumb',
		]) {
			expectSameParts(blocks, part)
		}
	})

	it('Pagination: стрелки, список, страницы и пропуски', async () => {
		const blocks = await pair(
			() => h(Pagination, { total: 100, value: 5, aria_label: 'Страницы' }),
			'<nav is="so-pagination" total="100" value="5" aria_label="Страницы"></nav>',
		)

		for (const part of [
			'.so-pagination',
			'.so-pagination__prev',
			'.so-pagination__list',
			'.so-pagination-item',
			'.so-pagination-item > .so-button',
			'.so-pagination__ellipsis',
			'.so-pagination__next',
		]) {
			expectSameParts(blocks, part)
		}
	})

	it('Scroller: кнопки, вьюпорт и пункты ленты', async (context) => {
		context.skip(webkitUntil('869fn0tx1'))
		const items = ['Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый', 'Шестой']
		const style = 'padding:4px 12px; white-space:nowrap'
		const blocks = await pair(
			() =>
				h(Scroller, null, () =>
					items.map((item) => h('span', { class: 'so-test-item', style }, item)),
				),
			`<div is="so-scroller">${items
				.map((item) => `<span class="so-test-item" style="${style}">${item}</span>`)
				.join('')}</div>`,
		)

		for (const part of [
			'.so-scroller',
			'.so-scroller__prev',
			'.so-scroller__viewport',
			'.so-scroller__next',
			'.so-test-item',
		]) {
			expectSameParts(blocks, part)
		}
	})
})

function isSlider(node: Element | null): node is TSliderElementProps {
	return node instanceof TSliderElement
}

function isRating(node: Element | null): node is TRatingElementProps {
	return node instanceof TRatingElement
}

/** Ползунок Web Components на странице шириной 400 px. */
async function slider(html: string): Promise<TSliderElementProps> {
	const root = await show(`<div style="${BOX}">${html}</div>`)
	const node = root.querySelector('[is="so-slider"]')

	if (!isSlider(node)) throw new Error('<span is="so-slider"> нет')

	return node
}

/** Точка у доли хода `fraction` — от левого верхнего угла дорожки. */
function along(track: Element, fraction: number) {
	const box = track.getBoundingClientRect()

	return { x: box.width * fraction, y: box.height / 2 }
}

describe('указатель и клавиши — как у Vue', () => {
	it('Slider: нажатие на дорожке ставит ближайшую ручку в точку нажатия', async () => {
		const el = await slider('<span is="so-slider" value="[10,90]"></span>')
		const track = find(el, '.so-slider__track', HTMLElement)

		await userEvent.click(track, { position: along(track, 0.3) })

		expect(el.ctrl?.value).toEqual([30, 90])
	})

	/**
	 * Взялись за ручку на 6 px правее центра — это полтора шага. Без смещения
	 * захвата значение прыгнуло бы к точке нажатия.
	 */
	it('Slider: ручка идёт за указателем со смещением захвата', async () => {
		const el = await slider('<span is="so-slider" value="50"></span>')
		const track = find(el, '.so-slider__track', HTMLElement)
		const from = along(track, 0.5)
		const to = along(track, 0.7)

		await userEvent.dragAndDrop(track, track, {
			sourcePosition: { x: from.x + 6, y: from.y },
			targetPosition: { x: to.x + 6, y: to.y },
		})

		expect(el.ctrl?.value).toBe(70)
		expect(find(el, '.so-slider__input', HTMLInputElement).value).toBe('70')
	})

	it('Slider: стрелка — ровно один шаг ядра, фокус остаётся на поле той же ручки', async () => {
		const el = await slider('<span is="so-slider" value="[20,80]"></span>')
		const field = all(el, '.so-slider__input')[1]

		if (!(field instanceof HTMLInputElement)) throw new Error('поля второй ручки нет')

		field.focus()
		await userEvent.keyboard('{ArrowRight}')
		await nextFrame()

		expect(el.ctrl?.value).toEqual([20, 81])
		expect(field.value).toBe('81')
		expect(document.activeElement).toBe(field)
	})

	it('Rating: нажатие на звезду ставит её целиком', async () => {
		const root = await show(`<div style="${BOX}"><span is="so-rating"></span></div>`)
		const el = root.querySelector('[is="so-rating"]')

		if (!isRating(el)) throw new Error('<span is="so-rating"> нет')

		const track = find(el, '.so-rating__track', HTMLElement)

		await userEvent.click(track, { position: along(track, 0.5) })

		expect(el.ctrl?.value).toBe(3)
		expect(find(el, '.so-rating__input', HTMLInputElement).value).toBe('3')
	})
})
