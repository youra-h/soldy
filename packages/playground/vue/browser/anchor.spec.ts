/**
 * `TAnchorPlugin` in a real browser: the layout jsdom doesn't compute.
 *
 * `getBoundingClientRect()` in jsdom is always zeros, so measuring the panel,
 * flip at the window's edge, the side of an open panel while the window moves
 * and the recalculation without scroll/resize (by `ResizeObserver`) are
 * checked only here. The plugin's unit tests (`overlay.spec.ts`) run the same
 * scenarios on stubbed coordinates — here the browser's real layout engine
 * computes them. So does tracking by the open state: here the panel fades by
 * the theme's real transition.
 *
 * Here too is the boundary the plugin shifts the panel inside: a real scrollbar
 * can't be stubbed, and without it `innerWidth` and the visible area coincide
 * and the guard is empty. For that the run drops `--hide-scrollbars`
 * (`vitest.browser.config.ts`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { DatePicker, Frame, Select, SelectItem } from '@soldy-ui/vue'
import type { TSelectPlacement } from '@soldy-ui/core'

import { find } from './colors'
import { settled, whileLeaving } from './transitions'
import { expectClassicScrollbar, expectInsideWindow } from './viewport'

import '@soldy-ui/theme-oren'

const OPTIONS = ['Москва', 'Тверь', 'Тула', 'Казань', 'Самара']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * An anchor button and a `Frame` above it. The plugin gets the anchor directly
 * as an `Element`, not through a component's `rootElement`, the way Select and
 * Popover pass it.
 */
const TopStartHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, open: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 300px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 'so-test-anchor',
					style: 'width: 80px; height: 32px',
					onClick: () => {
						this.open = true
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: this.open,
							anchor_anchor: this.anchorEl,
							anchor_placement: 'top-start',
							class: 'so-test-panel',
						},
						{
							default: () =>
								h('div', { style: 'width: 120px; height: 60px' }, 'panel'),
						},
					)
				: null,
		])
	},
})

/** The same anchor, but a click toggles its width — without a scroll or resize of the window. */
const ResizableAnchorHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, wide: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 250px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 'so-test-anchor',
					style: `width: ${this.wide ? 260 : 120}px; height: 32px`,
					onClick: () => {
						this.wide = !this.wide
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							anchor_matchWidth: true,
							class: 'so-test-panel',
						},
						{ default: () => h('div', { style: 'height: 40px' }, 'panel') },
					)
				: null,
		])
	},
})

/**
 * An anchor whose click changes only the border and the padding: the content
 * is the same, the content box unchanged, the border box grown.
 *
 * `box-sizing: content-box` is required here and set explicitly: the theme's
 * reset gives `so-*` nodes, this anchor among them, `border-box`, and with it
 * the fixed `width`/`height` would keep the anchor's outer size — nothing would
 * change.
 */
const PaddedAnchorHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, thick: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 200px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 'so-test-anchor',
					style: [
						'box-sizing: content-box; width: 120px; height: 32px',
						`padding: ${this.thick ? 20 : 0}px`,
						`border: ${this.thick ? 6 : 0}px solid`,
					].join('; '),
					onClick: () => {
						this.thick = true
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							anchor_matchWidth: true,
							class: 'so-test-panel',
						},
						{ default: () => h('div', { style: 'height: 40px' }, 'panel') },
					)
				: null,
		])
	},
})

/**
 * A panel above the anchor with `matchWidth` and a text that wraps: a click
 * narrows the anchor, and at the new width the panel grows taller.
 */
const WrappingPanelHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, narrow: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 300px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 'so-test-anchor',
					style: `width: ${this.narrow ? 120 : 360}px; height: 32px`,
					onClick: () => {
						this.narrow = true
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							anchor_anchor: this.anchorEl,
							anchor_placement: 'top-start',
							anchor_matchWidth: true,
							class: 'so-test-panel',
						},
						{ default: () => h('div', 'один два три четыре пять шесть семь') },
					)
				: null,
		])
	},
})

/** An anchor inside `dir="rtl"`: `-start` must align to the right edge. */
const RtlHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h(
			'div',
			{ dir: 'rtl', style: 'position: relative; padding-top: 250px; width: 400px' },
			[
				h(
					'button',
					{ ref: 'anchor', class: 'so-test-anchor', style: 'width: 200px; height: 32px' },
					'anchor',
				),
				this.anchorEl
					? h(
							Frame,
							{
								visible: true,
								anchor_anchor: this.anchorEl,
								anchor_placement: 'bottom-start',
								class: 'so-test-panel',
							},
							{
								default: () =>
									h('div', { style: 'width: 120px; height: 40px' }, 'panel'),
							},
						)
					: null,
			],
		)
	},
})

/**
 * An anchor wider than the panel, the panel centered above it (`top`). The
 * writing direction is a parameter: the center doesn't depend on it, and in RTL
 * the panel stands in the same place.
 */
const centerHarness = (dir: 'ltr' | 'rtl') =>
	defineComponent({
		data() {
			return { anchorEl: null as Element | null }
		},
		mounted() {
			this.anchorEl = this.$refs.anchor as Element
		},
		render() {
			return h(
				'div',
				{ dir, style: 'position: relative; padding-top: 250px; width: 400px' },
				[
					h(
						'button',
						{
							ref: 'anchor',
							class: 'so-test-anchor',
							style: 'width: 200px; height: 32px',
						},
						'anchor',
					),
					this.anchorEl
						? h(
								Frame,
								{
									visible: true,
									anchor_anchor: this.anchorEl,
									anchor_placement: 'top',
									class: 'so-test-panel',
								},
								{
									default: () =>
										h('div', { style: 'width: 120px; height: 40px' }, 'panel'),
								},
							)
						: null,
				],
			)
		},
	})

/**
 * An anchor and a `Frame` beside it — `end-start`: the panel at the end of the
 * anchor's line, top edges level. Where the anchor stands in the page's line is
 * set by `justify`: `center` — there is room on both sides, `flex-end` — at the
 * window's right edge. The writing direction is `dir`.
 */
const besideHarness = (justify: 'center' | 'flex-end', dir: 'ltr' | 'rtl' = 'ltr') =>
	defineComponent({
		data() {
			return { anchorEl: null as Element | null }
		},
		mounted() {
			this.anchorEl = this.$refs.anchor as Element
		},
		render() {
			return h(
				'div',
				{ dir, style: `display: flex; justify-content: ${justify}; padding-top: 200px` },
				[
					h(
						'button',
						{
							ref: 'anchor',
							class: 'so-test-anchor',
							style: 'width: 80px; height: 32px',
						},
						'anchor',
					),
					this.anchorEl
						? h(
								Frame,
								{
									visible: true,
									anchor_anchor: this.anchorEl,
									anchor_placement: 'end-start',
									class: 'so-test-panel',
								},
								{
									default: () =>
										h('div', { style: 'width: 100px; height: 60px' }, 'panel'),
								},
							)
						: null,
				],
			)
		},
	})

/**
 * An anchor at the very right edge of a page taller than the window, and a
 * panel notably wider than the room to its right.
 *
 * The `200vh` filler is here not for scrolling but for the scrollbar: it is the
 * test's subject. `innerWidth` counts the bar in, `documentElement.clientWidth`
 * doesn't, and which boundary shift took decides whether the panel is seen
 * whole or its edge hides under the bar.
 */
const RightEdgeHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', [
			h('div', { style: 'display: flex; justify-content: flex-end; padding-top: 100px' }, [
				h(
					'button',
					{ ref: 'anchor', class: 'so-test-anchor', style: 'width: 80px; height: 32px' },
					'anchor',
				),
			]),
			h('div', { style: 'height: 200vh' }),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							class: 'so-test-panel',
						},
						{
							default: () =>
								h('div', { style: 'width: 300px; height: 60px' }, 'panel'),
						},
					)
				: null,
		])
	},
})

/** Select with options. Without `placement` the prop isn't written at all — the default works. */
const selectWith = (placement?: TSelectPlacement) =>
	h(
		Select,
		{ name: 'Город', ...(placement ? { placement } : {}) },
		{
			default: () =>
				OPTIONS.map((text, index) =>
					h(SelectItem, { key: text, value: String(index), text }),
				),
		},
	)

/** The field almost at the window's bottom edge — the panel won't have room below. */
const selectAtBottom = (placement?: TSelectPlacement) => ({
	render: () =>
		h('div', [
			h('div', { style: 'height: calc(100vh - 48px)' }),
			h('div', { style: 'width: 320px' }, [selectWith(placement)]),
		]),
})

/** The field at the page's top edge — the panel has no room above. */
const selectAtTop = (placement?: TSelectPlacement) => ({
	render: () => h('div', { style: 'width: 320px' }, [selectWith(placement)]),
})

/**
 * The field at the window's bottom edge in the middle of a long page: there is
 * another screen below it, and the window has room to move.
 */
const selectOnLongPage = () => ({
	render: () =>
		h('div', [
			h('div', { style: 'height: calc(100vh - 48px)' }),
			h('div', { style: 'width: 320px' }, [selectWith()]),
			h('div', { style: 'height: 100vh' }),
		]),
})

const panel = () => document.querySelector('.so-test-panel') as HTMLElement
const anchor = () => document.querySelector('.so-test-anchor') as HTMLElement

beforeEach(() => {
	// The theme is read from the document's root — the same attribute as in `index.html`.
	document.documentElement.dataset.soTheme = 'oren'
})

/**
 * `render()` doesn't clean up after itself — without the cleanup the anchors
 * and panels of previous tests stay in the document, and `document.querySelector`
 * in the next test finds someone else's node instead of its own.
 */
afterEach(() => {
	cleanup()
	// The window a test scrolled goes back to the start
	window.scrollTo(0, 0)
})

describe('измерение панели', () => {
	/**
	 * While the panel is hidden by `v-show`, its size is zero, and the first
	 * calculation of coordinates (on the `show` event) still uses the zero
	 * height. `ResizeObserver` gets the right height a frame later, when the
	 * panel is visible — without it `top-start` would stand wrong on the first
	 * opening.
	 */
	it('top-start верно стоит на первом же открытии', async () => {
		render(TopStartHarness)

		await userEvent.click(anchor())

		const anchorRect = anchor().getBoundingClientRect()

		await expect.poll(() => panel().getBoundingClientRect().height).toBe(60)
		await expect
			.poll(() => panel().getBoundingClientRect().top)
			.toBeCloseTo(anchorRect.top - 60, 0)
		expect(panel().dataset.placement).toBe('top-start')
	})
})

describe('flip', () => {
	/** The panel's gap to the field — Select's `anchor_offset`. */
	const OFFSET = 4
	/** A scroll step per frame, px. */
	const STEP = 3

	const arrow = () => document.querySelector('.so-select__arrow') as HTMLElement
	const field = () => document.querySelector('.so-select__field input') as HTMLElement
	const selectPanel = () => document.querySelector('.so-select__panel') as HTMLElement

	/** The room below the field — by the Select root: it is the panel's anchor. */
	const below = () =>
		(window.visualViewport?.height ?? window.innerHeight) -
		find('.so-select').getBoundingClientRect().bottom

	/** The room an open panel needs on its side of the field. */
	const needed = () => selectPanel().getBoundingClientRect().height + OFFSET

	/**
	 * The window's offset from which an open panel fits below the field — with a
	 * margin of eight scroll steps. Measured with the window at the start.
	 */
	const farWhereBelowFits = () => Math.ceil(needed() - below()) + 8 * STEP

	/**
	 * The arrow — by a click in the page, not by `userEvent`. After closing, the
	 * arrow still turns by the theme's transition, and Playwright would deem it
	 * unstable: repeating the click, it scrolls the target to the window's bottom
	 * (`scrollIntoView({ block: 'end' })`) — where the panel doesn't fit below,
	 * and showing would pick the side there. These cases check the side, not the
	 * input.
	 */
	const toggleInPage = async () => {
		arrow().click()
		await nextTick()
	}

	it('Select у низа окна открывается вверх', async () => {
		render(selectAtBottom())

		await userEvent.click(arrow())

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')

		expect(selectPanel().getBoundingClientRect().bottom).toBeLessThanOrEqual(
			field().getBoundingClientRect().top + 1,
		)
	})

	/** `bottom` forbids flip: the panel stays below, though it doesn't fit there. */
	it('placement: bottom у низа окна остаётся снизу', async () => {
		render(selectAtBottom('bottom'))

		await userEvent.click(arrow())

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')

		expect(selectPanel().getBoundingClientRect().top).toBeGreaterThanOrEqual(
			field().getBoundingClientRect().bottom - 1,
		)
	})

	/** `top` at the page's top: there is no room above, but the consumer's side holds. */
	it('placement: top у верха страницы остаётся сверху', async () => {
		render(selectAtTop('top'))

		await userEvent.click(arrow())

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')
		await expect
			.poll(() => selectPanel().getBoundingClientRect().bottom)
			.toBeLessThanOrEqual(field().getBoundingClientRect().top + 1)
	})

	/**
	 * The window moves as a finger drives it on a phone: a few pixels a frame,
	 * across the former "fits below" boundary and back. A rule without memory
	 * took the open panel down at that boundary and back up — it jumped. An open
	 * panel keeps its side while it fits there, and the next opening picks the
	 * side anew.
	 */
	it('открытая панель держит сторону, пока окно едет через границу «снизу влезает»', async () => {
		render(selectOnLongPage())

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')

		// From this window offset the panel fits below, and the former rule would
		// take it down. The window passes it with a margin
		const far = farWhereBelowFits()

		const placements: Array<string | null> = []
		const record = () => placements.push(selectPanel().getAttribute('data-placement'))
		const observer = new MutationObserver(record)

		observer.observe(selectPanel(), { attributeFilter: ['data-placement'] })

		const scrollWindow = async (y: number) => {
			window.scrollTo(0, y)
			await nextFrame()

			expect(
				selectPanel().getBoundingClientRect().bottom,
				`панель над полем, окно на ${y}px`,
			).toBeLessThanOrEqual(field().getBoundingClientRect().top + 1)
		}

		for (let y = STEP; y <= far; y += STEP) await scrollWindow(y)

		expect(below(), 'снизу панель влезает').toBeGreaterThanOrEqual(needed())

		for (let y = far - STEP; y >= 0; y -= STEP) await scrollWindow(y)

		if (observer.takeRecords().length > 0) record()
		observer.disconnect()

		expect(placements, 'смены стороны').toEqual([])

		// Closed and, once the panel has disappeared, opened where it fits below —
		// showing picks the side
		await scrollWindow(far)
		await toggleInPage()
		await expect.poll(() => getComputedStyle(selectPanel()).display).toBe('none')

		expect(window.scrollY, 'окно там, где снизу влезает').toBe(far)

		await toggleInPage()

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect
			.poll(() => selectPanel().getBoundingClientRect().top)
			.toBeGreaterThanOrEqual(field().getBoundingClientRect().bottom - 1)
		expect(window.scrollY, 'окно стоит').toBe(far)
	})

	/**
	 * Showing picks the side anew also when the closed panel still fades: a
	 * fading one keeps its side like an open one, and it is showing that forgets
	 * the side, not the end of the fade. The closing's transitions are paused —
	 * showing finds the panel fading however slow the run.
	 */
	it('показ во время угасания выбирает сторону заново', async () => {
		render(selectOnLongPage())

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')
		await settled(selectPanel())

		const far = farWhereBelowFits()

		window.scrollTo(0, far)
		await nextFrame()

		// An open panel keeps its side even where it fits below
		expect(selectPanel().getAttribute('data-placement')).toBe('top-start')

		await toggleInPage()

		const fading = selectPanel().getAnimations()

		for (const animation of fading) animation.pause()

		await nextFrame()

		expect(fading.length, 'переходы закрытия').toBeGreaterThan(0)
		expect(selectPanel().dataset.open, 'закрыта').toBe('false')
		expect(getComputedStyle(selectPanel()).display, 'ещё на экране').not.toBe('none')

		await toggleInPage()

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect
			.poll(() => selectPanel().getBoundingClientRect().top)
			.toBeGreaterThanOrEqual(field().getBoundingClientRect().bottom - 1)
		expect(window.scrollY, 'окно стоит').toBe(far)
	})
})

/**
 * The very cause of the jitter on a phone: there the compositor scrolls the
 * page, and `scroll` reaches JS a frame later. A `fixed` panel stands still
 * until then, while the field has already moved. A panel at an anchor on the
 * page is `absolute`, in the document, and the browser applies the window's
 * scrolling to it together with the field.
 *
 * Measured right after `scrollTo`, in the same task: the layout is already
 * scrolled, while the browser sends `scroll` only in the next frame, and the
 * plugin couldn't have recalculated anything yet.
 */
describe('прокрутка окна', () => {
	const arrow = () => document.querySelector('.so-select__arrow') as HTMLElement
	const selectPanel = () => document.querySelector('.so-select__panel') as HTMLElement
	const gap = () =>
		selectPanel().getBoundingClientRect().top -
		find('.so-select').getBoundingClientRect().bottom

	it('панель едет с полем ещё до события scroll', async () => {
		render({
			render: () =>
				h('div', [
					h('div', { style: 'height: 100px' }),
					h('div', { style: 'width: 320px' }, [selectWith()]),
					h('div', { style: 'height: 200vh' }),
				]),
		})

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect.poll(gap).toBeGreaterThanOrEqual(0)

		const before = gap()
		const scrolled = vi.fn()

		window.addEventListener('scroll', scrolled, { once: true })
		window.scrollTo(0, 60)

		expect(window.scrollY, 'окно прокрутилось').toBe(60)
		expect(scrolled, 'scroll ещё не пришёл').not.toHaveBeenCalled()
		expect(gap()).toBeCloseTo(before, 0)

		window.removeEventListener('scroll', scrolled)
	})

	/**
	 * The window's scrolling doesn't move a field in a `fixed` header — and its
	 * panel is `fixed` too: in the document it would move away from the field
	 * until the recalculation.
	 */
	it('у поля в fixed-шапке панель стоит с ним ещё до события scroll', async () => {
		render({
			render: () =>
				h('div', [
					h('div', { style: 'position: fixed; top: 0; left: 0; width: 320px' }, [
						selectWith(),
					]),
					h('div', { style: 'height: 200vh' }),
				]),
		})

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect.poll(gap).toBeGreaterThanOrEqual(0)

		const before = gap()

		window.scrollTo(0, 60)

		expect(window.scrollY, 'окно прокрутилось').toBe(60)
		expect(gap()).toBeCloseTo(before, 0)
	})

	/**
	 * Focus can scroll a panel in the document into view. DatePicker moves focus
	 * to a day a frame after showing — before the panel is measured: it still
	 * stands below the field, by its zero height. Scrolling to it would carry the
	 * page away, and the panel would stay below. Focus going into the panel
	 * doesn't scroll the window.
	 */
	it('DatePicker у нижнего края открывается над полем, окно стоит', async () => {
		render({
			render: () =>
				h('div', [
					h('div', { style: 'height: calc(100vh - 48px)' }),
					h('div', { style: 'width: 320px' }, [
						h(DatePicker, { value: '2026-05-12', aria_label: 'Дата' }),
					]),
					h('div', { style: 'height: 100vh' }),
				]),
		})

		await userEvent.click(find('.so-date-picker__trigger'))
		await expect
			.poll(() => document.activeElement?.classList.contains('so-calendar-item'))
			.toBe(true)
		await expect
			.poll(() => find('.so-date-picker__panel').getAttribute('data-placement'))
			.toBe('top-start')

		expect(window.scrollY).toBe(0)
	})
})

/**
 * The plugin computes the panel's place only while it is on screen: shown or
 * still fading. The field here is in an inner scroll, and the panel is in
 * `body`, so only the recalculation on the block's `scroll` moves it after the
 * field. A fading panel follows the field to the end, and a closed one doesn't
 * answer scrolling: its place stands.
 */
describe('слежение по открытости', () => {
	const arrow = () => find('.so-select__arrow')
	const selectPanel = () => find('.so-select__panel')
	/** The gap between the field and the panel below it: unchanged while the panel follows. */
	const gap = () =>
		selectPanel().getBoundingClientRect().top -
		find('.so-select').getBoundingClientRect().bottom

	it('гаснущая панель идёт за полем до конца, закрытая место не считает', async () => {
		render({
			render: () =>
				h('div', { class: 'so-test-scroller', style: 'height: 400px; overflow-y: auto' }, [
					h('div', { style: 'height: 60px' }),
					h('div', { style: 'width: 320px' }, [selectWith()]),
					h('div', { style: 'height: 1000px' }),
				]),
		})

		const scroller = find('.so-test-scroller')

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await settled(selectPanel())

		const open = gap()
		let scrolled = 0

		// At each moment of the leaving the block scrolls by a step. `scroll`
		// comes a frame later, and the moment waits until the panel is at the
		// field again: the leaving is paused, and the panel stays on screen
		await whileLeaving(
			selectPanel(),
			() => userEvent.click(arrow()),
			async () => {
				scrolled += 4
				scroller.scrollTop = scrolled

				await expect
					.poll(() => Math.abs(gap() - open), { message: `зазор, блок на ${scrolled}px` })
					.toBeLessThan(1)
			},
		)

		expect(scroller.scrollTop, 'блок прокрутился').toBe(scrolled)

		// The plugin learns of the closing's end a microtask after the transition's end
		await nextFrame()

		const top = selectPanel().style.top

		scroller.scrollTop = scrolled + 100
		await nextFrame()
		await nextFrame()

		expect(scroller.scrollTop, 'блок прокрутился').toBe(scrolled + 100)
		expect(selectPanel().style.top, 'закрытая панель место не считает').toBe(top)
	})
})

describe('пересчёт без scroll/resize окна', () => {
	it('якорь меняет ширину — matchWidth панели едет следом', async () => {
		render(ResizableAnchorHarness)

		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(120, 0)

		await userEvent.click(anchor())

		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(260, 0)
	})

	/**
	 * The observers watch the border box — exactly what the plugin measures by
	 * `getBoundingClientRect()`. Only the anchor's border and padding change: the
	 * content box is the same, and with the `content-box` default there would be
	 * no notification at all, and the panel's `y` and width would stay stale
	 * until the window's next scroll/resize.
	 */
	it('у якоря сменились только рамка и паддинг — bottom-start и matchWidth едут следом', async () => {
		render(PaddedAnchorHarness)

		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(120, 0)

		const before = anchor().getBoundingClientRect()

		await userEvent.click(anchor())

		// First make sure it is the anchor's border box that changed: otherwise
		// the check below would pass on a motionless panel too.
		await expect
			.poll(() => anchor().getBoundingClientRect().width)
			.toBeGreaterThan(before.width)
		expect(anchor().getBoundingClientRect().height).toBeGreaterThan(before.height)

		await expect
			.poll(() => panel().getBoundingClientRect().width)
			.toBeCloseTo(anchor().getBoundingClientRect().width, 0)
		await expect
			.poll(() => panel().getBoundingClientRect().top)
			.toBeCloseTo(anchor().getBoundingClientRect().bottom, 0)
	})

	/**
	 * On the anchor's notification the plugin stops observing the panel until
	 * the next frame — otherwise the panel's notification would be skipped in the
	 * same step. At the new width the text wrapped, and the panel grew while
	 * nobody watched it: the plugin can correct `y` only by the returned
	 * observation.
	 */
	it('якорь сузился, текст панели перенёсся — top-start поправляет y по вернувшемуся наблюдению', async () => {
		render(WrappingPanelHarness)

		await expect
			.poll(() => panel().getBoundingClientRect().bottom)
			.toBeCloseTo(anchor().getBoundingClientRect().top, 0)

		const height = panel().getBoundingClientRect().height

		await userEvent.click(anchor())

		await expect.poll(() => panel().getBoundingClientRect().height).toBeGreaterThan(height)
		await expect
			.poll(() => panel().getBoundingClientRect().bottom)
			.toBeCloseTo(anchor().getBoundingClientRect().top, 0)
	})
})

describe('RTL', () => {
	it('dir=rtl выравнивает -start по правому краю якоря', async () => {
		render(RtlHarness)

		const anchorRect = anchor().getBoundingClientRect()

		// The browser knows the panel's width at once (it has no hidden phase),
		// while the coordinate comes asynchronously — through
		// `ready`/`ResizeObserver`. So the coordinate is polled, not the size:
		// otherwise a frame before the plugin recalculated `x` for RTL could be
		// caught.
		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(anchorRect.right, 0)
	})
})

describe('центр', () => {
	/** The rectangle's horizontal middle. */
	const middle = (rect: DOMRect) => rect.left + rect.width / 2

	/**
	 * The plugin learns the panel's width by `ready` and `ResizeObserver`, so the
	 * middle is polled: in the frame before the measurement the panel stands with
	 * its left edge at the anchor's middle.
	 */
	it.each(['ltr', 'rtl'] as const)(
		'%s: top ставит середину панели над серединой якоря',
		async (dir) => {
			render(centerHarness(dir))

			const anchorRect = anchor().getBoundingClientRect()

			await expect
				.poll(() => middle(panel().getBoundingClientRect()))
				.toBeCloseTo(middle(anchorRect), 0)
			await expect
				.poll(() => panel().getBoundingClientRect().bottom)
				.toBeCloseTo(anchorRect.top, 0)
			expect(panel().dataset.placement).toBe('top')
		},
	)
})

/**
 * The line's sides: `end-start` puts the panel at the end of the anchor's line,
 * top edges level. The end is logical: on the right in LTR, on the left in RTL.
 * At the window's right edge flip moves the panel to the line's start, and
 * `data-placement` names the logical side it stood on.
 *
 * The plugin learns the coordinates by `ready` and `ResizeObserver`, so the
 * panel's edge is polled: in the frame before the measurement the panel stands
 * by a zero width.
 */
describe('боковые стороны', () => {
	it('end-start в LTR — справа от якоря, верхние края вровень', async () => {
		render(besideHarness('center'))

		const anchorRect = anchor().getBoundingClientRect()

		await expect
			.poll(() => panel().getBoundingClientRect().left)
			.toBeCloseTo(anchorRect.right, 0)
		expect(panel().getBoundingClientRect().top).toBeCloseTo(anchorRect.top, 0)
		expect(panel().dataset.placement).toBe('end-start')
	})

	it('у правого края окна end-start встаёт слева от якоря — start-start', async () => {
		render(besideHarness('flex-end'))

		const anchorRect = anchor().getBoundingClientRect()

		// There really is no room for the panel on the right
		expect(document.documentElement.clientWidth - anchorRect.right).toBeLessThan(100)

		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(anchorRect.left, 0)
		expect(panel().getBoundingClientRect().top).toBeCloseTo(anchorRect.top, 0)
		expect(panel().dataset.placement).toBe('start-start')
		expectInsideWindow(panel(), 'панель')
	})

	it('dir=rtl: end — слева от якоря, data-placement логический', async () => {
		render(besideHarness('center', 'rtl'))

		const anchorRect = anchor().getBoundingClientRect()

		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(anchorRect.left, 0)
		expect(panel().getBoundingClientRect().top).toBeCloseTo(anchorRect.top, 0)
		expect(panel().dataset.placement).toBe('end-start')
	})
})

describe('граница — видимая область', () => {
	/**
	 * The scrollbar's width for the test's time is its own, a known one.
	 *
	 * The platform's one differs — Windows locally, Ubuntu in CI, — and
	 * somewhere the bar is an overlay taking no room at all. It isn't what this
	 * spec guards: it needs `innerWidth` and `clientWidth` to differ surely more
	 * than the subpixel tolerance.
	 */
	const SCROLLBAR = 20

	let style: HTMLStyleElement | null = null

	beforeEach(() => {
		style = document.createElement('style')
		style.textContent = `html::-webkit-scrollbar { width: ${SCROLLBAR}px }`
		document.head.append(style)
	})

	afterEach(() => {
		style?.remove()
		style = null
	})

	/**
	 * The guard of fix 869f4puaa: shift's boundary is `window.visualViewport`,
	 * not `window.innerWidth`. The difference between them is the width of a
	 * classic scrollbar, so without a bar in the run (Playwright starts Chromium
	 * with `--hide-scrollbars`, the flag is dropped in
	 * `vitest.browser.config.ts`) the test is green with any implementation.
	 */
	it('панель у правого края прижата к видимой области, а не к innerWidth', async () => {
		render(RightEdgeHarness)

		expectClassicScrollbar()

		const root = document.documentElement
		const anchorRect = anchor().getBoundingClientRect()

		// The shift is really needed: without it the panel, aligned to the
		// anchor's left edge, would go past the visible area's edge.
		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(300, 0)
		expect(anchorRect.left + 300, 'без сдвига панель не помещается').toBeGreaterThan(
			root.clientWidth,
		)

		// The panel's right edge matches the visible area's edge. The comparison is
		// two-sided: "a gap under a pixel" holds for a panel that went past the
		// edge too — exactly the case under guard.
		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(root.clientWidth, 0)

		expectInsideWindow(panel(), 'панель')
	})
})
