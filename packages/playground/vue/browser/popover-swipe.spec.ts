/**
 * The Popover gesture in a real browser: swipe the panel to close it.
 *
 * The gesture's rules — threshold, path, velocity, resistance — are checked by
 * the plugin's spec (`plugins/__tests__/swipe.plugin.spec.ts`) on markup it
 * builds itself, and jsdom performs neither layout nor pointer capture. Here is
 * what the markup and the theme make on screen: the strip is at the edge on the
 * trigger's side and doesn't cover the content, `touch-action` is on the panel,
 * a press on the strip doesn't take focus away, and a real mouse closes the
 * panel away from the trigger — down below it, up above it, inside a container
 * towards its edge (`edge`, the strip at the opposite one), — and towards the
 * trigger returns it to its place. A swiped panel leaves while it fades and
 * disappears once it has faded; without motion a panel with a strip fades in
 * place.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref } from 'vue'
import { Button, Popover } from '@soldy-ui/vue'
import type { IPopoverProps } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'

import { reducedMotion } from './media'
import { expectFadesInPlace, expectHidesWhenFaded, whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** The gesture strip's grip zone — at least 24px: the target minimum of WCAG 2.5.8. */
const GRIP_ZONE = 24

/** Tolerance for subpixel rounding of coordinates. */
const EPSILON = 1

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type TShowOptions = {
	/** The page's top padding, px: with little room below the trigger the panel goes above it */
	top?: number
	/** The popover in a 400 × 300 container: the panel at its edge, not at the trigger */
	contained?: boolean
	/** The container's direction: in RTL a line starts on the right */
	dir?: 'ltr' | 'rtl'
}

/**
 * A page with a popover on `v-model:open`: the trigger and two buttons in the
 * panel — two Tab stops, and opening puts focus on the first.
 */
const show = async (
	props: Partial<IPopoverProps> = {},
	{ top = 40, contained = false, dir = 'ltr' }: TShowOptions = {},
) => {
	const opened = ref(false)

	const popover = () =>
		h(
			Popover,
			{
				aria_label: 'Проверка',
				...props,
				contained,
				open: opened.value,
				'onUpdate:open': (value: boolean) => {
					opened.value = value
				},
			},
			{
				trigger: ({ triggerAria, triggerDataset }: TTriggerScope) =>
					h(Button, {
						text: 'Открыть',
						class: 'so-test-trigger',
						...triggerAria,
						...triggerDataset,
					}),
				default: () => [
					h('button', { class: 'so-test-first' }, 'Первая'),
					h('button', { class: 'so-test-second' }, 'Вторая'),
				],
			},
		)

	render(
		defineComponent({
			render: () =>
				h('div', { style: `padding: ${top}px 40px 40px` }, [
					contained
						? h(
								'div',
								{
									class: 'so-test-host',
									dir,
									style: 'position: relative; width: 400px; height: 300px',
								},
								[popover()],
							)
						: popover(),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()

	return { opened }
}

/** A node by selector; without it the test fails here, not on reading a property. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const trigger = () => find('.so-test-trigger')
const panel = () => find('.so-popover__panel')
const handle = () => find('.so-popover__handle')
const active = () => document.activeElement
const isOpen = () => getComputedStyle(panel()).display !== 'none'

/** Open by a click and wait until focus goes into the panel and the panel stands in its place. */
const open = async () => {
	await userEvent.click(trigger())
	await expect.poll(active).toBe(find('.so-test-first'))
	// A panel in a container slides in from its edge: the geometry is read after the transition
	await Promise.all(
		panel()
			.getAnimations()
			.map((animation) => animation.finished),
	)
}

/** Drag the mouse from the node's middle by `dx`, `dy` — with real events, in steps. */
const dragBy = (from: HTMLElement, dx: number, dy: number, steps = 10) => {
	const box = from.getBoundingClientRect()
	const x = box.width / 2
	const y = box.height / 2

	// `force`: the release point is outside the node, and Playwright's hit check
	// would wait until the node is under it
	return userEvent.dragAndDrop(from, from, {
		sourcePosition: { x, y },
		targetPosition: { x: x + dx, y: y + dy },
		steps,
		force: true,
	})
}

/** Drag the mouse from the node's middle by `dy` vertically. */
const drag = (from: HTMLElement, dy: number, steps = 10) => dragBy(from, 0, dy, steps)

beforeEach(async () => {
	document.documentElement.dataset.soTheme = 'oren'
	await page.viewport(1000, 700)
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
})

describe('полоса', () => {
	it('без жеста полосы нет и сдвига у панели нет: translate не делает её контейнером', async () => {
		await show()
		await open()

		expect(document.querySelector('.so-popover__handle')).toBeNull()
		expect(getComputedStyle(panel()).translate).toBe('none')
	})

	it('под триггером — у верхнего края панели, зона захвата не меньше 24px', async () => {
		await show({ swipe: 'handle' })
		await open()

		const grip = handle().getBoundingClientRect()
		const box = panel().getBoundingClientRect()

		expect(panel().dataset.placement).toBe('bottom-start')
		expect(grip.height).toBeGreaterThanOrEqual(GRIP_ZONE)
		expect(Math.abs(grip.top - box.top)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(grip.width - box.width)).toBeLessThanOrEqual(EPSILON)
	})

	it('над триггером — у нижнего края панели', async () => {
		await show({ swipe: 'handle', placement: 'top-start' }, { top: 400 })
		await open()

		const grip = handle().getBoundingClientRect()
		const box = panel().getBoundingClientRect()

		expect(panel().dataset.placement).toBe('top-start')
		expect(Math.abs(grip.bottom - box.bottom)).toBeLessThanOrEqual(EPSILON)
	})

	it('содержимое и крестик полоса не накрывает', async () => {
		await show({ swipe: 'handle' })
		await open()

		const grip = handle().getBoundingClientRect()

		expect(find('.so-popover__content').getBoundingClientRect().top).toBeGreaterThanOrEqual(
			grip.bottom - EPSILON,
		)
		expect(find('.so-popover__close').getBoundingClientRect().top).toBeGreaterThanOrEqual(
			grip.bottom - EPSILON,
		)
	})

	it('пока жест включён, касание по вертикали — жесту: touch-action на панели', async () => {
		await show({ swipe: 'handle' })
		await open()

		expect(getComputedStyle(panel()).touchAction).toBe('pan-x pinch-zoom')
	})

	it('нажатие на полосу фокус не уводит и панель не закрывает', async () => {
		await show({ swipe: 'handle' })
		await open()

		await userEvent.click(handle())

		expect(active()).toBe(find('.so-test-first'))
		expect(isOpen()).toBe(true)
	})
})

describe('жест', () => {
	it('под триггером смахнули вниз — закрыта, v-model видит, фокус — на триггер', async () => {
		const { opened } = await show({ swipe: 'handle' })

		await open()
		await drag(handle(), 150)

		await expect.poll(isOpen).toBe(false)
		expect(opened.value).toBe(false)
		expect(active()).toBe(trigger())
	})

	it('над триггером — вверх', async () => {
		const { opened } = await show({ swipe: 'handle', placement: 'top-start' }, { top: 400 })

		await open()
		await drag(handle(), -150)

		await expect.poll(isOpen).toBe(false)
		expect(opened.value).toBe(false)
	})

	it('к триггеру — не закрытие: панель возвращается на место', async () => {
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

	/**
	 * A panel in a container is pressed to its `edge`, the strip is at the
	 * opposite edge, and it is swiped towards the edge. The physical side
	 * follows the container's direction: `start` in RTL is on the right.
	 */
	describe('внутри контейнера — к своему краю', () => {
		type TSide = 'top' | 'bottom' | 'left' | 'right'

		const opposite: Record<TSide, TSide> = {
			top: 'bottom',
			bottom: 'top',
			left: 'right',
			right: 'left',
		}

		/** A step towards a side: where to pull for the panel to go to it. */
		const toward: Record<TSide, [number, number]> = {
			top: [0, -150],
			bottom: [0, 150],
			left: [-150, 0],
			right: [150, 0],
		}

		it.each([
			['top', 'ltr', 'top'],
			['bottom', 'ltr', 'bottom'],
			['start', 'ltr', 'left'],
			['end', 'ltr', 'right'],
			['start', 'rtl', 'right'],
			['end', 'rtl', 'left'],
		] as const)(
			'%s (%s): панель у края %s, полоса — у противоположного, от края не смахнуть',
			async (edge, dir, side) => {
				const { opened } = await show({ swipe: 'handle', edge }, { contained: true, dir })

				await open()

				const host = find('.so-test-host').getBoundingClientRect()
				const box = panel().getBoundingClientRect()

				expect(find('.so-test-host').contains(panel())).toBe(true)
				expect(Math.abs(box[side] - host[side])).toBeLessThan(EPSILON)
				expect(
					Math.abs(
						handle().getBoundingClientRect()[opposite[side]] - box[opposite[side]],
					),
				).toBeLessThan(EPSILON)

				const [dx, dy] = toward[opposite[side]]

				await dragBy(handle(), dx, dy)
				await expect
					.poll(() => panel().style.getPropertyValue('--so-swipe-offset'))
					.toBe('')

				expect(isOpen()).toBe(true)

				await dragBy(handle(), ...toward[side])

				await expect.poll(isOpen).toBe(false)
				expect(opened.value).toBe(false)
			},
		)
	})

	it('за всю панель — тянут за свободное место, с кнопки — нет', async () => {
		const { opened } = await show({ swipe: 'panel' })

		await open()
		await drag(find('.so-test-first'), 150)

		expect(isOpen()).toBe(true)

		await drag(handle(), 150)

		await expect.poll(isOpen).toBe(false)
		expect(opened.value).toBe(false)
	})
})

/**
 * A swiped panel doesn't blink: the plugin keeps the offset on closing, and
 * the theme takes the closed panel to its side, like a drawer, — the leaving
 * starts where the panel was released and goes on while it fades. Had it
 * returned to its place and then faded, a blink would show. The panel
 * disappears once it has faded, not once it has arrived: the tail of the path
 * past the fade isn't seen.
 */
describe('уход смахнутой панели', () => {
	/** Swipe the panel by `swipe` and read its position on the axis at each moment of leaving. */
	const leaving = async (axis: 'top' | 'left', swipe: () => Promise<unknown>) => {
		const positions: number[] = []
		const transitions = await whileLeaving(panel(), swipe, () => {
			positions.push(panel().getBoundingClientRect()[axis])
		})

		expectHidesWhenFaded(transitions)

		return positions
	}

	/** One way: each next position is no closer to the start than the previous one. */
	const expectOneWay = (positions: number[], sign: 1 | -1) => {
		for (let index = 1; index < positions.length; index += 1) {
			expect((positions[index] - positions[index - 1]) * sign).toBeGreaterThanOrEqual(
				-EPSILON,
			)
		}
	}

	it('у триггера — дальше от него, гаснет на ходу', async () => {
		await show({ swipe: 'handle' })
		await open()

		const start = panel().getBoundingClientRect().top
		const positions = await leaving('top', () => drag(handle(), 150))

		expectOneWay(positions, 1)
		expect(positions[0]).toBeGreaterThan(start + EPSILON)
	})

	it.each([
		['top', 'top', -1],
		['start', 'left', -1],
	] as const)('в контейнере у края %s — дальше к краю', async (edge, axis, sign) => {
		await show({ swipe: 'handle', edge }, { contained: true })
		await open()

		const start = panel().getBoundingClientRect()[axis]
		const positions = await leaving(axis, () =>
			dragBy(handle(), axis === 'left' ? -150 : 0, axis === 'top' ? -150 : 0),
		)

		expectOneWay(positions, sign)
		expect((positions[0] - start) * sign).toBeGreaterThan(EPSILON)
	})

	/**
	 * Without motion (here — at the system's request) a panel with a strip
	 * doesn't leave the trigger: it fades in place, like a panel without a
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
