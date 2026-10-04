/**
 * Жест Popover в настоящем браузере: смахнуть панель, чтобы закрыть.
 *
 * Правила жеста — порог, путь, скорость, сопротивление — проверяет плагин
 * (`plugins/__tests__/swipe.plugin.spec.ts`) на разметке, которую строит сам,
 * а jsdom ни раскладки, ни захвата указателя не выполняет. Здесь — что из
 * разметки и темы выходит на экране: полоса у края со стороны триггера и не
 * накрывает содержимое, `touch-action` на панели, нажатие на полосу фокус не
 * уводит, а настоящая мышь закрывает панель от триггера — вниз под ним, вверх
 * над ним, внутри контейнера к своему краю (`edge`, полоса — у противоположного)
 * — и к триггеру возвращает её на место.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref } from 'vue'
import { Button, Popover } from '@soldy-ui/vue'
import type { IPopoverProps } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'

import { whileLeaving } from './transitions'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Зона захвата полосы жеста — не меньше 24px: минимум цели по WCAG 2.5.8. */
const GRIP_ZONE = 24

/** Допуск на субпиксельное округление координат. */
const EPSILON = 1

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type TShowOptions = {
	/** Отступ страницы сверху, px: под триггером мало места — панель над ним */
	top?: number
	/** Поповер в контейнере 400 × 300: панель у его края, а не у триггера */
	contained?: boolean
	/** Направление контейнера: в RTL начало строки — справа */
	dir?: 'ltr' | 'rtl'
}

/**
 * Страница с поповером на `v-model:open`: триггер и две кнопки в панели — две
 * остановки Tab, и фокус при открытии встаёт на первую.
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
						class: 's-test-trigger',
						...triggerAria,
						...triggerDataset,
					}),
				default: () => [
					h('button', { class: 's-test-first' }, 'Первая'),
					h('button', { class: 's-test-second' }, 'Вторая'),
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
									class: 's-test-host',
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

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const trigger = () => find('.s-test-trigger')
const panel = () => find('.s-popover__panel')
const handle = () => find('.s-popover__handle')
const active = () => document.activeElement
const isOpen = () => getComputedStyle(panel()).display !== 'none'

/** Открыть кликом и дождаться, пока фокус уйдёт в панель, а панель встанет на место. */
const open = async () => {
	await userEvent.click(trigger())
	await expect.poll(active).toBe(find('.s-test-first'))
	// Панель в контейнере въезжает от своего края: геометрия — после перехода
	await Promise.all(
		panel()
			.getAnimations()
			.map((animation) => animation.finished),
	)
}

/** Протянуть мышью от середины узла на `dx`, `dy` — настоящими событиями, по шагам. */
const dragBy = (from: HTMLElement, dx: number, dy: number, steps = 10) => {
	const box = from.getBoundingClientRect()
	const x = box.width / 2
	const y = box.height / 2

	// `force`: точка отпускания — за пределами узла, и проверка попадания
	// Playwright ждала бы, пока узел окажется под ней
	return userEvent.dragAndDrop(from, from, {
		sourcePosition: { x, y },
		targetPosition: { x: x + dx, y: y + dy },
		steps,
		force: true,
	})
}

/** Протянуть мышью от середины узла на `dy` по вертикали. */
const drag = (from: HTMLElement, dy: number, steps = 10) => dragBy(from, 0, dy, steps)

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'
	await page.viewport(1000, 700)
})

afterEach(() => {
	cleanup()
})

describe('полоса', () => {
	it('без жеста полосы нет и сдвига у панели нет: translate не делает её контейнером', async () => {
		await show()
		await open()

		expect(document.querySelector('.s-popover__handle')).toBeNull()
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

		expect(find('.s-popover__content').getBoundingClientRect().top).toBeGreaterThanOrEqual(
			grip.bottom - EPSILON,
		)
		expect(find('.s-popover__close').getBoundingClientRect().top).toBeGreaterThanOrEqual(
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

		expect(active()).toBe(find('.s-test-first'))
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

		// Сдвиг уходит кадром позже, и панель едет на место переходом
		await expect
			.poll(() => Math.abs(panel().getBoundingClientRect().top - top) < EPSILON)
			.toBe(true)

		expect(isOpen()).toBe(true)
		expect(opened.value).toBe(true)
		expect(panel().style.getPropertyValue('--s-swipe-offset')).toBe('')
	})

	/**
	 * Панель в контейнере прижата к краю `edge`, полоса — у противоположного
	 * края, смахивают к краю. Физическая сторона — с учётом направления
	 * контейнера: `start` в RTL — справа.
	 */
	describe('внутри контейнера — к своему краю', () => {
		type TSide = 'top' | 'bottom' | 'left' | 'right'

		const opposite: Record<TSide, TSide> = {
			top: 'bottom',
			bottom: 'top',
			left: 'right',
			right: 'left',
		}

		/** Шаг к стороне: куда тянуть, чтобы панель ушла к ней. */
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

				const host = find('.s-test-host').getBoundingClientRect()
				const box = panel().getBoundingClientRect()

				expect(find('.s-test-host').contains(panel())).toBe(true)
				expect(Math.abs(box[side] - host[side])).toBeLessThan(EPSILON)
				expect(
					Math.abs(
						handle().getBoundingClientRect()[opposite[side]] - box[opposite[side]],
					),
				).toBeLessThan(EPSILON)

				const [dx, dy] = toward[opposite[side]]

				await dragBy(handle(), dx, dy)
				await expect.poll(() => panel().style.getPropertyValue('--s-swipe-offset')).toBe('')

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
		await drag(find('.s-test-first'), 150)

		expect(isOpen()).toBe(true)

		await drag(handle(), 150)

		await expect.poll(isOpen).toBe(false)
		expect(opened.value).toBe(false)
	})
})

/**
 * Смахнутая панель не моргает: плагин снимает сдвиг вместе с закрытием, а
 * тема уводит закрытую панель к её стороне, как выезжающую панель, — уход
 * начинается с места, где её отпустили, и идёт дальше, пока панель гаснет.
 * Вернись она на место, а потом погасни, — было бы видно мигание.
 */
describe('уход смахнутой панели', () => {
	/** Положение панели по оси в каждом кадре ухода, пока она не пропала. */
	const leaving = async (axis: 'top' | 'left') => {
		const positions: number[] = []
		const seen = await whileLeaving(panel(), () => {
			positions.push(panel().getBoundingClientRect()[axis])
		})

		expect(seen).toBeGreaterThan(1)

		return positions
	}

	/** Идут в одну сторону: каждое следующее не ближе к началу, чем прошлое. */
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

		await drag(handle(), 150)

		const positions = await leaving('top')

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

		await dragBy(handle(), axis === 'left' ? -150 : 0, axis === 'top' ? -150 : 0)

		const positions = await leaving(axis)

		expectOneWay(positions, sign)
		expect((positions[0] - start) * sign).toBeGreaterThan(EPSILON)
	})
})
