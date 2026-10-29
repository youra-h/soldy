// @vitest-environment jsdom

/**
 * Bringing the focused tag into the window of a `scroll` row.
 *
 * The arithmetic is the shared one (`nearestShift`, the scroller uses it too),
 * and it is checked with numbers: subpixels, both edges and an element wider
 * than the window — what is hardest to set up by layout in a browser. The
 * window here is [100, 300]: the row's padding box without `scroll-padding`.
 * A shift is as for `scrollBy`: how far the row moves to the left. The writing
 * direction doesn't matter: the nearest shift is the same both ways.
 *
 * The plugin's wiring is below, in jsdom: which mode and which focus it takes
 * and how it moves the row. jsdom doesn't compute node boxes, the test sets
 * them. The real layout and the browser's order of events —
 * `playground/vue/browser/tags-overflow.spec.ts` and `select-tags.spec.ts`.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { TTags } from '@soldy-ui/core'
import type { TTagsOverflow } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TTagsScrollPlugin } from '../src'
import { nearestShift } from '../src/utils'
import type { TInlineSpan } from '../src/utils'

/** The window of every arithmetic case. */
const WINDOW: TInlineSpan = { left: 100, right: 300 }

const span = (left: number, right: number): TInlineSpan => ({ left, right })

/** Where a span ends up after the row's shift. */
const shifted = (box: TInlineSpan, shift: number): TInlineSpan =>
	span(box.left - shift, box.right - shift)

/** There is a shift — otherwise there's nothing to check the placement of. */
const required = (shift: number | null): number => {
	if (shift === null) throw new Error('сдвига нет')

	return shift
}

describe('доводка: тег уже в окне', () => {
	it('ряд не трогаем', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(120, 180), item: span(110, 190) }),
		).toBeNull()
	})

	/** The row stops at a whole pixel, while the tags' edges are fractional. */
	it.each([
		{ side: 'в начале', inside: span(99.6, 180), outside: span(99.4, 180) },
		{ side: 'в конце', inside: span(220, 300.4), outside: span(220, 300.6) },
	])('край, вышедший из окна $side на полпикселя, — ещё в окне', ({ inside, outside }) => {
		expect(nearestShift({ scrollWindow: WINDOW, focused: inside, item: inside })).toBeNull()
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: outside, item: outside }),
		).not.toBeNull()
	})
})

/**
 * A tag no wider than the window goes into it whole — at the nearer edge: the
 * row has no snap, and there's no reason to put the tag at the window's start.
 */
describe('доводка: тег не шире окна — к ближнему краю окна', () => {
	it('за краем в конце — конец тега у конца окна', () => {
		const item = span(260, 340)
		const shift = nearestShift({ scrollWindow: WINDOW, focused: span(310, 330), item })

		expect(shift).toBe(40)
		expect(shifted(item, required(shift)).right).toBe(WINDOW.right)
	})

	it('за краем в начале — начало тега у начала окна', () => {
		const item = span(60, 140)
		const shift = nearestShift({ scrollWindow: WINDOW, focused: span(70, 90), item })

		expect(shift).toBe(-40)
		expect(shifted(item, required(shift)).left).toBe(WINDOW.left)
	})

	/**
	 * The close button is in the window, the tag's label past the edge. In
	 * selection mode the pill draws the ring, and a close button without its
	 * label doesn't tell which tag it closes: the whole tag goes into the
	 * window.
	 */
	it('элемент под фокусом в окне, а тег нет — сдвиг до всего тега', () => {
		const item = span(40, 190)
		const shift = nearestShift({ scrollWindow: WINDOW, focused: span(160, 180), item })

		expect(shift).toBe(-60)
		expect(shifted(item, required(shift)).left).toBe(WINDOW.left)
	})
})

/**
 * A tag wider than the window won't fit in it: it covers the window, with the
 * focused element inside. Of such placements — the nearest.
 */
describe('доводка: тег шире окна — накрывает окно', () => {
	/** The outcome: the focused element is in the window, the tag covers it. */
	const expectPlaced = (focused: TInlineSpan, item: TInlineSpan, shift: number) => {
		const placedFocus = shifted(focused, shift)
		const placedItem = shifted(item, shift)

		expect(placedFocus.left, 'элемент под фокусом: левый край').toBeGreaterThanOrEqual(
			WINDOW.left,
		)
		expect(placedFocus.right, 'элемент под фокусом: правый край').toBeLessThanOrEqual(
			WINDOW.right,
		)
		expect(placedItem.left, 'тег накрывает окно слева').toBeLessThanOrEqual(WINDOW.left)
		expect(placedItem.right, 'тег накрывает окно справа').toBeGreaterThanOrEqual(WINDOW.right)
	}

	/**
	 * The close button at the end of a long tag past the window's edge. With the
	 * tag's start put at the window's start, the button would stay past the
	 * edge, at [510, 540].
	 */
	it('крестик в конце встаёт у края окна', () => {
		const focused = span(560, 590)
		const item = span(150, 600)
		const shift = required(nearestShift({ scrollWindow: WINDOW, focused, item }))

		expect(shift).toBe(290)
		expectPlaced(focused, item, shift)
	})

	it('элемент у начала тега за краем в начале — встаёт у начала окна', () => {
		const focused = span(-390, -370)
		const item = span(-400, 250)
		const shift = required(nearestShift({ scrollWindow: WINDOW, focused, item }))

		expect(shift).toBe(-490)
		expectPlaced(focused, item, shift)
	})

	it('тег уже накрывает окно, и элемент под фокусом в нём — ряд не трогаем', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(250, 280), item: span(50, 450) }),
		).toBeNull()
	})
})

/**
 * A focused element wider than the window fits in it at no shift, and most of
 * it shows when it covers the window.
 */
describe('доводка: элемент под фокусом шире окна', () => {
	it('уже накрывает окно — ряд не трогаем', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(50, 350), item: span(40, 360) }),
		).toBeNull()
	})

	it('за краем — ближайшее положение, где он накрывает окно', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(250, 550), item: span(240, 560) }),
		).toBe(150)
	})
})

/**
 * Without the area's element only the focused element is brought into the
 * window: that is how the scroller checks "already in the window" when its
 * element is wider than the window (`resolveFocusShift`).
 */
describe('доводка: без элемента области', () => {
	it('элемент под фокусом в окне — сдвига нет', () => {
		expect(nearestShift({ scrollWindow: WINDOW, focused: span(160, 180) })).toBeNull()
	})

	it('за краем — к ближнему краю окна', () => {
		expect(nearestShift({ scrollWindow: WINDOW, focused: span(320, 350) })).toBe(50)
	})
})

/**
 * The wiring: which mode and which focus the plugin takes and how it moves the
 * row.
 *
 * The markup is the row with its tags, as Vue draws them: a pill with a line
 * and a close button in it. The window is [10, 290]: the row [0, 300] without
 * a `scroll-padding` of 10 on each side.
 */
describe('плагин: фокус в ряду', () => {
	const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

	/**
	 * jsdom has no `ResizeObserver`. The plugin doesn't need it, but the stub
	 * guards against a neighbour in the bundle that would create one.
	 */
	beforeAll(() => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				unobserve(): void {}
				disconnect(): void {}
			},
		)
	})

	afterAll(() => {
		vi.unstubAllGlobals()
	})

	afterEach(() => {
		document.body.innerHTML = ''
	})

	/** A node by selector; without it the test fails here, not on reading a property. */
	const nodeOf = (selector: string): HTMLElement => {
		const node = document.querySelector(selector)

		if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

		return node
	}

	/** The node's box along the line — jsdom doesn't compute it. */
	const place = (node: Element, left: number, right: number) => {
		vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
			new DOMRect(left, 0, right - left, 20),
		)
	}

	/**
	 * Focus the browser would count as visible (`:focus-visible`) or not. The
	 * test sets the visibility: jsdom has its own heuristic, and the plugin
	 * only cares about the answer. How the browser gives it (Tab — yes, a mouse
	 * press — no) is checked by `playground/vue/browser/tags-overflow.spec.ts`.
	 */
	const focusWith = (target: HTMLElement, visible: boolean) => {
		vi.spyOn(target, 'matches').mockImplementation((selector: string) =>
			selector === ':focus-visible'
				? visible
				: Element.prototype.matches.call(target, selector),
		)
		target.focus()
	}

	async function mount(overflow: TTagsOverflow = 'scroll') {
		document.body.insertAdjacentHTML(
			'beforeend',
			`<div class="so-tags" style="scroll-padding-left: 10px; scroll-padding-right: 10px">
				<div class="so-tags-item first">
					<div class="first-row" tabindex="0">Москва</div>
					<button class="first-close">×</button>
				</div>
				<div class="so-tags-item second">
					<div class="second-row" tabindex="-1">Тверь</div>
					<button class="second-close">×</button>
				</div>
			</div>`,
		)

		const owner = new TTags({ overflow })
		const root = nodeOf('.so-tags')
		const scrollBy = vi.fn()

		place(root, 0, 300)
		Object.defineProperty(root, 'clientWidth', { value: 300 })
		// jsdom knows no scrolling at all — a spy catches the shift
		Object.defineProperty(root, 'scrollBy', { value: scrollBy })

		const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TTagsScrollPlugin)
		const element = bundle.get(TElementPlugin)

		if (!element) throw new Error('узла корня нет')

		element.element = root
		// Plugins get the root a frame later
		await nextFrame()

		return { owner, bundle, root, scrollBy }
	}

	/**
	 * The second tag at the row's end is partly visible: the line in the
	 * window, the close button past the edge.
	 */
	const secondAtEnd = () => {
		place(nodeOf('.second'), 240, 320)
		place(nodeOf('.second-row'), 240, 290)
		place(nodeOf('.second-close'), 290, 310)
	}

	it('фокус с клавиатуры у края — ряд сдвигается сразу и мгновенно', async () => {
		const { scrollBy } = await mount()

		secondAtEnd()
		focusWith(nodeOf('.second-close'), true)

		// Synchronously, in the `focusin` handler: no frame to wait for
		expect(scrollBy).toHaveBeenCalledOnce()
		expect(scrollBy).toHaveBeenCalledWith({ left: 30, behavior: 'instant' })
	})

	/**
	 * The focused line is in the window, the pill past the edge: in selection
	 * mode the pill draws the ring, and the whole tag goes into the window, not
	 * the line.
	 */
	it('в окно встаёт тег — прямой ребёнок ряда, а не элемент под фокусом', async () => {
		const { scrollBy } = await mount()

		place(nodeOf('.first'), -20, 100)
		place(nodeOf('.first-row'), 15, 75)
		focusWith(nodeOf('.first-row'), true)

		expect(scrollBy).toHaveBeenCalledWith({ left: -30, behavior: 'instant' })
	})

	/**
	 * WebKit keeps the scroll position in whole pixels and truncates a
	 * fractional target toward zero: a fractional shift would leave the tag
	 * short of the window. The row moves by whole pixels, rounded away from
	 * zero — both ways.
	 */
	it.each([
		{
			way: 'к концу ряда',
			arrange: () => {
				place(nodeOf('.second'), 240.4, 320.4)
				place(nodeOf('.second-close'), 290.4, 310.4)
			},
			focused: '.second-close',
			left: 31,
		},
		{
			way: 'к началу ряда',
			arrange: () => {
				place(nodeOf('.first'), -20.4, 99.6)
				place(nodeOf('.first-row'), 15, 75)
			},
			focused: '.first-row',
			left: -31,
		},
	])('дробный сдвиг $way — на целые пиксели, от нуля', async ({ arrange, focused, left }) => {
		const { scrollBy } = await mount()

		arrange()
		focusWith(nodeOf(focused), true)

		expect(scrollBy).toHaveBeenCalledWith({ left, behavior: 'instant' })
	})

	it('тег в окне — ряд стоит', async () => {
		const { scrollBy } = await mount()

		place(nodeOf('.first'), 10, 100)
		place(nodeOf('.first-close'), 70, 90)
		focusWith(nodeOf('.first-close'), true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/**
	 * Focus from a mouse press: had the row moved between the press and the
	 * release, another tag would be under the pointer, and `click` would miss.
	 */
	it('фокус не с клавиатуры — ряд стоит', async () => {
		const { scrollBy } = await mount()

		secondAtEnd()
		focusWith(nodeOf('.second-close'), false)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/** A row without stops of its own becomes a Tab stop itself: it is the window. */
	it('фокус на самом ряду — ряд стоит', async () => {
		const { root, scrollBy } = await mount()

		root.tabIndex = 0
		focusWith(root, true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/** In `wrap` the row doesn't scroll. */
	it('wrap — ряд стоит', async () => {
		const { scrollBy } = await mount('wrap')

		secondAtEnd()
		focusWith(nodeOf('.second-close'), true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	it('режим сменился — плагин берётся за ряд и отпускает его', async () => {
		const { owner, scrollBy } = await mount('wrap')
		const close = nodeOf('.second-close')

		secondAtEnd()

		owner.overflow = 'scroll'
		focusWith(close, true)

		expect(scrollBy).toHaveBeenCalledOnce()

		close.blur()
		owner.overflow = 'wrap'
		focusWith(close, true)

		expect(scrollBy).toHaveBeenCalledOnce()
	})

	it('после уничтожения набора фокус ряд не двигает', async () => {
		const { bundle, scrollBy } = await mount()

		bundle.destroy()
		secondAtEnd()
		focusWith(nodeOf('.second-close'), true)

		expect(scrollBy).not.toHaveBeenCalled()
	})
})
