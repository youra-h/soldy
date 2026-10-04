/**
 * Жест Popover в настоящем браузере: смахнуть панель, чтобы закрыть.
 *
 * Правила жеста — порог, путь, скорость, сопротивление — проверяет плагин
 * (`plugins/__tests__/swipe.plugin.spec.ts`) на разметке, которую строит сам,
 * а jsdom ни раскладки, ни захвата указателя не выполняет. Здесь — что из
 * разметки и темы выходит на экране: полоса у края со стороны триггера и не
 * накрывает содержимое, `touch-action` на панели, нажатие на полосу фокус не
 * уводит, а настоящая мышь закрывает панель от триггера — вниз под ним, вверх
 * над ним, внутри контейнера вниз — и к триггеру возвращает её на место.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref } from 'vue'
import { Button, Popover } from '@soldy-ui/vue'
import type { IPopoverProps } from '@soldy-ui/core'
import type { DescriptorSlots, PopoverDescriptor } from '@soldy-ui/setup'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof PopoverDescriptor>['trigger']

/** Зона захвата полосы жеста — не меньше 44px. */
const GRIP_ZONE = 44

/** Допуск на субпиксельное округление координат. */
const EPSILON = 1

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type TShowOptions = {
	/** Отступ страницы сверху, px: под триггером мало места — панель над ним */
	top?: number
	/** Поповер в контейнере 400 × 300: панель накрывает его, а не встаёт у триггера */
	contained?: boolean
}

/**
 * Страница с поповером на `v-model:open`: триггер и две кнопки в панели — две
 * остановки Tab, и фокус при открытии встаёт на первую.
 */
const show = async (
	props: Partial<IPopoverProps> = {},
	{ top = 40, contained = false }: TShowOptions = {},
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

/** Открыть кликом и дождаться, пока фокус уйдёт в панель. */
const open = async () => {
	await userEvent.click(trigger())
	await expect.poll(active).toBe(find('.s-test-first'))
}

/** Протянуть мышью от середины узла на `dy` по вертикали — настоящими событиями, по шагам. */
const drag = (from: HTMLElement, dy: number, steps = 10) => {
	const box = from.getBoundingClientRect()
	const x = box.width / 2
	const y = box.height / 2

	// `force`: точка отпускания — за пределами узла, и проверка попадания
	// Playwright ждала бы, пока узел окажется под ней
	return userEvent.dragAndDrop(from, from, {
		sourcePosition: { x, y },
		targetPosition: { x, y: y + dy },
		steps,
		force: true,
	})
}

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

	it('под триггером — у верхнего края панели, зона захвата не меньше 44px', async () => {
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

	it('внутри контейнера — вниз', async () => {
		const { opened } = await show({ swipe: 'handle' }, { contained: true })

		await open()

		expect(find('.s-test-host').contains(panel())).toBe(true)

		await drag(handle(), 150)

		await expect.poll(isOpen).toBe(false)
		expect(opened.value).toBe(false)
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
