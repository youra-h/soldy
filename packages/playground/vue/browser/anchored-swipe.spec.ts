/**
 * The gesture of the panels at a field in a real browser: Select and
 * DatePicker — swipe the panel to close it.
 *
 * The gesture's rules — threshold, path, velocity, resistance — are checked by
 * the plugin's spec (`plugins/__tests__/swipe.plugin.spec.ts`) on markup it
 * builds itself, and jsdom performs neither layout nor pointer capture. Here is
 * what the markup and the theme make on screen, after the popover at its
 * trigger (`popover-swipe.spec.ts`): the strip is at the edge on the field's
 * side and doesn't cover the content, `touch-action` is on the panel, a real
 * mouse closes the panel away from the field — down below it, up above it, —
 * and towards the field returns it to its place, and a swiped panel leaves
 * further from the field while it fades and disappears once it has faded.
 * Without motion a panel with a strip fades in place.
 *
 * Each has its own: in Select focus stays on the field all the time, and a
 * press on the strip doesn't take it away; in DatePicker closing by the gesture
 * returns focus to the field, like Escape, and the panel's content scrolls,
 * and a gesture by the whole panel doesn't start from it.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref, type Ref, type VNode } from 'vue'
import { DatePicker, Select, SelectItem } from '@soldy-ui/vue'
import type { TSwipe } from '@soldy-ui/core'

import { reducedMotion } from './media'
import {
	durationOf,
	expectFadesInPlace,
	expectHidesWhenFaded,
	pausedTransitions,
	settled,
} from './transitions'

import '@soldy-ui/theme-oren'

/** The gesture strip's grip zone — at least 24px: the target minimum of WCAG 2.5.8. */
const GRIP_ZONE = 24

/** Tolerance for subpixel rounding of coordinates. */
const EPSILON = 1

/**
 * The moments of the fade, as its shares, at which a leaving panel's place is
 * read: from the start to near the end — at the end `display` takes it off the
 * screen.
 */
const MOMENTS = [0, 0.25, 0.5, 0.75]

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** A node by selector; without it the test fails here, not on reading a property. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const active = () => document.activeElement

type TShowOptions = {
	/** What to pull by; not set — no gesture */
	swipe?: TSwipe
	/** The panel above the field: there is little room below */
	above?: boolean
}

/** A component with a panel at its field — all the shared checks need to know about it. */
type TCase = {
	readonly name: string
	/** A page with the component on `v-model:open` */
	readonly show: (options?: TShowOptions) => Promise<{ opened: Ref<boolean> }>
	/** Open it as a user does and wait until the panel stands in its place */
	readonly open: () => Promise<void>
	readonly panel: string
	readonly handle: string
	/** The panel's content, which the strip doesn't cover */
	readonly content: string
}

/**
 * The page: the component in a wrapper with a top padding. For Select the
 * panel goes above the field by `placement: 'top'`; DatePicker has no side to
 * choose — the field stands at the window's bottom, and flip puts the panel
 * above it by itself.
 */
const mountPage = async (top: number, scene: () => VNode): Promise<void> => {
	render(
		defineComponent({
			render: () =>
				h('div', { style: `padding: ${top}px 40px 40px; width: 320px` }, [scene()]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** The open model — like a consumer's `v-model:open`. */
const openModel = () => {
	const opened = ref(false)

	return {
		opened,
		bind: () => ({
			open: opened.value,
			'onUpdate:open': (value: boolean) => {
				opened.value = value
			},
		}),
	}
}

const CITIES = ['Москва', 'Тверь', 'Тула', 'Казань']

const SELECT: TCase = {
	name: 'Select',
	async show({ swipe, above = false } = {}) {
		const { opened, bind } = openModel()

		await mountPage(above ? 400 : 40, () =>
			h(Select, { swipe, placement: above ? 'top' : 'auto', ...bind() }, () =>
				CITIES.map((text, index) =>
					h(SelectItem, { key: text, value: String(index), text }),
				),
			),
		)

		return { opened }
	},
	async open() {
		await userEvent.click(find('.so-select__field input'))
		await expect.poll(() => find('.so-select__panel').dataset.open).toBe('true')
		await settled(find('.so-select__panel'))
	},
	panel: '.so-select__panel',
	handle: '.so-select__handle',
	content: '.so-select__list',
}

const DATE_PICKER: TCase = {
	name: 'DatePicker',
	async show({ swipe, above = false } = {}) {
		const { opened, bind } = openModel()

		await mountPage(above ? 560 : 40, () =>
			h(DatePicker, { swipe, value: '2026-05-12', aria_label: 'Дата', ...bind() }),
		)

		return { opened }
	},
	async open() {
		await userEvent.click(find('.so-date-picker__trigger'))
		// Focus goes to a grid day a frame later — the panel is in place by then
		await expect.poll(() => active()?.classList.contains('so-calendar-item')).toBe(true)
		await settled(find('.so-date-picker__panel'))
	},
	panel: '.so-date-picker__panel',
	handle: '.so-date-picker__handle',
	content: '.so-date-picker__content',
}

/** Drag the mouse from the node's middle by `dy` vertically — with real events, in steps. */
const drag = (from: HTMLElement, dy: number, steps = 10) => {
	const box = from.getBoundingClientRect()
	const x = box.width / 2
	const y = box.height / 2

	// `force`: the release point is outside the node, and Playwright's hit check
	// would wait until the node is under it
	return userEvent.dragAndDrop(from, from, {
		sourcePosition: { x, y },
		targetPosition: { x, y: y + dy },
		steps,
		force: true,
	})
}

beforeEach(async () => {
	document.documentElement.dataset.soTheme = 'oren'
	await page.viewport(1000, 700)
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
})

describe.each([SELECT, DATE_PICKER])('$name', ({ show, open, ...selectors }) => {
	const panel = () => find(selectors.panel)
	const handle = () => find(selectors.handle)
	const isOpen = () => getComputedStyle(panel()).display !== 'none'

	describe('полоса', () => {
		it('без жеста полосы нет и сдвига у панели нет: translate не делает её контейнером', async () => {
			await show()
			await open()

			expect(document.querySelector(selectors.handle)).toBeNull()
			expect(getComputedStyle(panel()).translate).toBe('none')
		})

		it('под полем — у верхнего края панели, зона захвата не меньше 24px, во всю ширину', async () => {
			await show({ swipe: 'handle' })
			await open()

			const grip = handle().getBoundingClientRect()
			const box = panel().getBoundingClientRect()

			expect(panel().dataset.placement).toBe('bottom-start')
			expect(grip.height).toBeGreaterThanOrEqual(GRIP_ZONE)
			expect(Math.abs(grip.top - box.top)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(grip.width - box.width)).toBeLessThanOrEqual(EPSILON)
		})

		it('над полем — у нижнего края панели', async () => {
			await show({ swipe: 'handle', above: true })
			await open()

			const grip = handle().getBoundingClientRect()
			const box = panel().getBoundingClientRect()

			expect(panel().dataset.placement).toBe('top-start')
			expect(Math.abs(grip.bottom - box.bottom)).toBeLessThanOrEqual(EPSILON)
		})

		it('содержимое полоса не накрывает — ни под полем, ни над ним', async () => {
			await show({ swipe: 'handle' })
			await open()

			expect(find(selectors.content).getBoundingClientRect().top).toBeGreaterThanOrEqual(
				handle().getBoundingClientRect().bottom - EPSILON,
			)

			cleanup()

			await show({ swipe: 'handle', above: true })
			await open()

			expect(find(selectors.content).getBoundingClientRect().bottom).toBeLessThanOrEqual(
				handle().getBoundingClientRect().top + EPSILON,
			)
		})

		it('пока жест включён, касание по вертикали — жесту: touch-action на панели', async () => {
			await show({ swipe: 'handle' })
			await open()

			expect(getComputedStyle(panel()).touchAction).toBe('pan-x pinch-zoom')
		})
	})

	describe('жест', () => {
		it('под полем смахнули вниз — закрыта, v-model видит закрытие', async () => {
			const { opened } = await show({ swipe: 'handle' })

			await open()
			await drag(handle(), 150)

			await expect.poll(isOpen).toBe(false)
			expect(opened.value).toBe(false)
		})

		it('над полем — вверх', async () => {
			const { opened } = await show({ swipe: 'handle', above: true })

			await open()
			await drag(handle(), -150)

			await expect.poll(isOpen).toBe(false)
			expect(opened.value).toBe(false)
		})

		it('к полю — не закрытие: панель возвращается на место', async () => {
			const { opened } = await show({ swipe: 'handle' })

			await open()

			const top = panel().getBoundingClientRect().top

			await drag(handle(), -150)

			// The offset goes a frame later, and the panel travels back by a transition
			await expect
				.poll(() => Math.abs(panel().getBoundingClientRect().top - top) < EPSILON)
				.toBe(true)

			expect(isOpen()).toBe(true)
			expect(opened.value).toBe(true)
			expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('')
		})
	})

	/**
	 * A swiped panel doesn't blink: the plugin keeps the offset on closing, and
	 * the theme takes the closed panel further from the field, like the popover
	 * from its trigger, — the leaving starts where the panel was released and
	 * goes on while it fades. Both panels are taller than the gesture's path,
	 * and up to their own height a closed one has room to go: had it stopped
	 * where it was released, the leaving wouldn't have worked. The panel
	 * disappears once it has faded, not once it has arrived: the tail of the
	 * path past the fade isn't seen.
	 *
	 * The path is read at moments of the fade (`MOMENTS`), on the panel's
	 * transitions paused from their start (`pausedTransitions`), and not frame by
	 * frame: under load frames come rarely, and in WebKit in Docker the panel
	 * was on screen for a single frame of its fade.
	 */
	it('уход смахнутой панели — от места, где отпустили, дальше от поля, гаснет на ходу', async () => {
		await show({ swipe: 'handle' })
		await open()

		const start = panel().getBoundingClientRect().top
		const leaving = await pausedTransitions(panel(), () => drag(handle(), 150))
		const display = leaving.get('display')

		if (display === undefined) throw new Error('display: перехода не было')

		// On screen the panel stays as long as `display` runs — the fade's time
		const fade = durationOf(display)
		const positions = MOMENTS.map((share) => {
			for (const transition of leaving.values()) transition.currentTime = fade * share

			return panel().getBoundingClientRect().top
		})

		expect(positions[0], 'уход — от места, где отпустили').toBeGreaterThan(start + EPSILON)
		expect(positions[positions.length - 1], 'уходит дальше от поля').toBeGreaterThan(
			positions[0] + EPSILON,
		)

		for (let index = 1; index < positions.length; index += 1) {
			expect(positions[index] - positions[index - 1]).toBeGreaterThanOrEqual(-EPSILON)
		}

		expectHidesWhenFaded(leaving)
	})

	/**
	 * Without motion (here — at the system's request) a panel with a strip
	 * doesn't leave the field: it fades in place, like a panel without a
	 * gesture, and disappears once it has faded. It has no leaving time, and
	 * `display` must not take it.
	 */
	it('без движения — гаснет на месте и пропадает, когда догасла', async () => {
		await reducedMotion('reduce')
		await show({ swipe: 'handle' })

		// The emulation is on — otherwise the guard would check the usual mode
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

		await open()
		await expectFadesInPlace(panel(), () => userEvent.keyboard('{Escape}'))
	})
})

describe('Select', () => {
	const field = () => find('.so-select__field input')

	it('нажатие на полосу фокус с поля не уводит и панель не закрывает', async () => {
		await SELECT.show({ swipe: 'handle' })
		await SELECT.open()

		expect(active()).toBe(field())

		await userEvent.click(find('.so-select__handle'))

		expect(active()).toBe(field())
		expect(getComputedStyle(find('.so-select__panel')).display).not.toBe('none')
	})

	it('смахнутая панель оставляет фокус на поле', async () => {
		await SELECT.show({ swipe: 'handle' })
		await SELECT.open()
		await drag(find('.so-select__handle'), 150)

		await expect.poll(() => find('.so-select__panel').dataset.open).toBe('false')
		expect(active()).toBe(field())
	})
})

describe('DatePicker', () => {
	const panel = () => find('.so-date-picker__panel')
	const content = () => find('.so-date-picker__content')
	const isOpen = () => getComputedStyle(panel()).display !== 'none'

	/** Opened by the button: focus returns to the field, to its first part (the month in en-US), not to the button. */
	it('после закрытия жестом фокус возвращается в поле, как после Escape', async () => {
		await DATE_PICKER.show({ swipe: 'handle' })
		await DATE_PICKER.open()
		await drag(find('.so-date-picker__handle'), 150)

		await expect.poll(isOpen).toBe(false)
		await expect
			.poll(active)
			.toBe(find('.so-date-picker .so-date-input__segment[data-type="month"]'))
	})

	it('за всю панель — тянут за место без контролов: шапку дней недели', async () => {
		const { opened } = await DATE_PICKER.show({ swipe: 'panel' })

		await DATE_PICKER.open()
		await drag(find('.so-calendar__weekday'), 150)

		await expect.poll(isOpen).toBe(false)
		expect(opened.value).toBe(false)
	})

	/**
	 * In a low window the calendar is taller than the panel. The content
	 * scrolls, not the panel: the gesture plugin gives a touch along the
	 * panel's axis to the gesture, and a finger wouldn't scroll a scrollable
	 * panel itself, while the content has a scroll of its own. A gesture by the
	 * whole panel doesn't start from it — it scrolls by itself.
	 */
	it('прокручивается содержимое, а не панель, и из него жест не начинается', async () => {
		await page.viewport(1000, 300)

		const { opened } = await DATE_PICKER.show({ swipe: 'panel' })

		await DATE_PICKER.open()

		expect(getComputedStyle(panel()).overflowY).toBe('hidden')
		expect(panel().scrollHeight).toBeLessThanOrEqual(panel().clientHeight)
		expect(getComputedStyle(content()).overflowY).toBe('auto')
		expect(content().scrollHeight).toBeGreaterThan(content().clientHeight)
		expect(getComputedStyle(panel()).touchAction).toBe('pan-x pinch-zoom')
		expect(getComputedStyle(content()).touchAction).toBe('auto')

		// Further than a quarter of the panel's height: had the gesture started,
		// the panel would have closed. And within the window: below its edge the
		// pointer doesn't reach the page anymore
		await drag(find('.so-calendar__weekday'), 100)
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(opened.value).toBe(true)
		expect(panel().dataset.swiping).toBe('false')
		expect(panel().style.getPropertyValue('--so-swipe-offset')).toBe('')
	})
})
