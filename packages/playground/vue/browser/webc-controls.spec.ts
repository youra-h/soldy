/**
 * Controls and navigation of Web Components in a real browser:
 * `<span is="so-progress-linear">`, `<span is="so-slider">`,
 * `<span is="so-rating">`, `<nav is="so-pagination">` and
 * `<div is="so-scroller">`.
 *
 * To the theme the root of an element is the root of any other adapter: the
 * parts of the bar, the slider, the rating, the pagination and the strip stand
 * where Vue's stand, of the same size. A real pointer drags the thumb, and an
 * arrow on the field is exactly one step of the core: the plugins are Vue's,
 * and they find the parts by class and as direct children. jsdom computes
 * neither layout nor browser actions; the markup and the core's sets are
 * guarded by `ui/webc/__tests__/progress-linear.spec.ts`, `slider.spec.ts`,
 * `rating.spec.ts`, `pagination.spec.ts` and `scroller.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
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

/** The test's Web Components markup, removed after each test. */
let stage: HTMLElement | null = null

/**
 * The markup on the page, with the plugins' listeners on the elements: the
 * plugins attach them on the node's `ready`, and `TElementPlugin` announces the
 * node a frame later. Element properties go before the insertion: an attribute
 * can't carry a list of marks.
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

/** The node by selector; without it, or of another kind, the test fails here. */
function find<T extends Element>(root: ParentNode, selector: string, type: new () => T): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** HTML elements by selector. */
const all = (root: ParentNode, selector: string): HTMLElement[] =>
	[...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

/**
 * The node's place in the block, from the block's corner, and its size, in
 * pixels. A node without a box (`display: none`, as an empty mark label) has
 * no place: its rectangle is zero, at the corner of the window, not the block.
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

/** A block of one width for the pair of components. */
const BOX = 'width: 400px; padding: 48px 24px 24px'

/**
 * A Web Components element and a Vue component side by side, in equal blocks
 * of one width. The theme sees the same classes and markup inside the root,
 * and the parts take the same places.
 */
async function pair(
	vue: () => ReturnType<typeof h>,
	html: string,
	props: Record<string, unknown> = {},
): Promise<{ vue: HTMLElement; webc: HTMLElement }> {
	// The pointer is where the last test or spec left it, and a part under it
	// changes its box on hover (a Rating star scales up): move it to the page
	// corner, into the block's padding. Not `unhover`: that puts the pointer at
	// the center of `body`, where the pair will stand
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
 * The parts of one selector in both, in order, at the same places and of the
 * same sizes. A part may have no box — the theme hides an empty mark label by
 * `:empty`, and a mark has no extent along the axis — but one at least has a
 * size, so the check isn't empty. Parts are any elements: a star's icon is an
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

	it('Scroller: кнопки, вьюпорт и пункты ленты', async () => {
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

		// Until the strip is measured, the base layer of themes hides both
		// buttons by design, and the measurement comes a frame after `ready`. In
		// WebKit the polyfill brings the element to life after the insertion, its
		// frames queue behind the test's, and the two frames of `show` miss the
		// measurement. Wait for it, not for frames
		await expect
			.poll(() =>
				[blocks.vue, blocks.webc].map(
					(block) => find(block, '.so-scroller', HTMLElement).dataset.canNext,
				),
			)
			.toEqual(['true', 'true'])

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

/** A Web Components slider on a page 400 px wide. */
async function slider(html: string): Promise<TSliderElementProps> {
	const root = await show(`<div style="${BOX}">${html}</div>`)
	const node = root.querySelector('[is="so-slider"]')

	if (!isSlider(node)) throw new Error('<span is="so-slider"> нет')

	return node
}

/** The point at `fraction` of the travel, from the track's top left corner. */
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
	 * The thumb is grabbed 6 px right of its center, a step and a half. Without
	 * the grab offset the value would jump to the press point.
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
