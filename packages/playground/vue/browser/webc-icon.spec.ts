/**
 * `<span is="so-icon">` в настоящем браузере: корень — `span`, рисунок —
 * `<svg>` внутри.
 *
 * Теме корень `span` — то же, что корень `svg` в остальных адаптерах: блок
 * (правило темы), размер ступени и `width`/`height` — у корня, а рисунок
 * растянут на корень атрибутами `width` и `height="100%"`, и о вложенном
 * `<svg>` тема не знает. Мера — корень `svg` с теми же классами в таком же
 * хосте: так иконку рисуют остальные адаптеры. Хост — блочный, как строка
 * текста: строчный `span` размер не берёт вовсе. jsdom раскладки не считает,
 * поэтому спек браузерный; разметку и наборы ядра сторожит
 * `ui/webc/__tests__/icon.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { getIcon } from '@soldy-ui/setup'
import { TIconElement, type TIconElementProps } from '@soldy-ui/webc'

import '@soldy-ui/theme-oren'

/** Узел разметки теста — снимается после каждого. */
let stage: HTMLElement | null = null

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

async function show(html: string): Promise<HTMLElement> {
	const node = document.createElement('div')

	node.innerHTML = html
	document.body.appendChild(node)
	stage = node
	await nextFrame()

	return node
}

afterEach(() => {
	stage?.remove()
	stage = null
})

function isIcon(node: Element | null): node is TIconElementProps {
	return node instanceof TIconElement
}

/** Иконка soldy разметки теста; нет её — тест падает здесь. */
function icon(root: ParentNode): TIconElementProps {
	const node = root.querySelector('[is="so-icon"]')

	if (!isIcon(node)) throw new Error('<span is="so-icon"> нет')

	return node
}

function find<T extends Element>(
	root: ParentNode,
	selector: string,
	type: abstract new () => T,
): T {
	const node = root.querySelector(selector)

	if (!(node instanceof type)) throw new Error(`${selector}: узла нет`)

	return node
}

/** Рисунок иконки — `<svg>` в её корне. */
const picture = (el: Element) => find(el, ':scope > svg', SVGSVGElement)

/** Место и размер узла на странице. */
function rect(node: Element) {
	const { left, top, width, height } = node.getBoundingClientRect()

	return { left, top, width, height }
}

/** Корень, каким иконку рисуют остальные адаптеры: `<svg>` с классами Icon и рисунком роли. */
function reference(size: string): string {
	const { viewBox, body } = getIcon('close')

	return `<svg class="so-icon so-icon--size-${size}" viewBox="${viewBox}">${body}</svg>`
}

describe.each(COMPONENT_SIZES)('размер %s', (size) => {
	it('коробка корня — как у корня svg, рисунок — во весь корень', async () => {
		const root = await show(`
			<div><span is="so-icon" icon="close" size="${size}"></span></div>
			<div>${reference(size)}</div>
		`)
		const el = icon(root)
		const box = rect(el)
		const svg = rect(find(root, 'svg.so-icon', SVGSVGElement))

		expect(box.width).toBeGreaterThan(0)
		expect([box.width, box.height]).toEqual([svg.width, svg.height])
		expect(rect(picture(el))).toEqual(box)
	})
})

describe('размер из разметки', () => {
	it('width и height — коробка корня, рисунок — во весь корень', async () => {
		const el = icon(
			await show('<span is="so-icon" icon="close" width="40" height="24"></span>'),
		)
		const box = rect(el)

		expect([box.width, box.height]).toEqual([40, 24])
		expect(rect(picture(el))).toEqual(box)
	})
})

/** Место иконки в её кнопке: сдвиг от угла кнопки и размер. */
function placeIn(button: Element, node: Element) {
	const outer = rect(button)
	const inner = rect(node)

	return {
		left: inner.left - outer.left,
		top: inner.top - outer.top,
		width: inner.width,
		height: inner.height,
	}
}

describe('в кнопке', () => {
	/**
	 * Иконка в слоте по умолчанию — в области текста: блок там центруют
	 * авто-отступы. Строчный корень встал бы на базовую линию текста, а
	 * растянутый рисунок без размера корня занял бы всю область.
	 */
	it('кнопка шире иконки — иконка по центру и на месте корня svg', async () => {
		const style = 'width: 96px; height: 40px'
		const root = await show(`
			<button is="so-button" class="own" style="${style}"><span is="so-icon" icon="close"></span></button>
			<button is="so-button" class="other" style="${style}">${reference('normal')}</button>
		`)
		const own = find(root, 'button.own', HTMLButtonElement)
		const other = find(root, 'button.other', HTMLButtonElement)
		const place = placeIn(own, icon(root))
		const { width, height } = rect(own)

		expect(place.width).toBeGreaterThan(0)
		expect(place).toEqual(placeIn(other, find(other, 'svg.so-icon', SVGSVGElement)))
		expect(Math.abs(place.left + place.width / 2 - width / 2)).toBeLessThan(1)
		expect(Math.abs(place.top + place.height / 2 - height / 2)).toBeLessThan(1)
	})
})
