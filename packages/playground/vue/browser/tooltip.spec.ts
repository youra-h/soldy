/**
 * Tooltip в настоящем браузере: то, чего jsdom не считает.
 *
 * Эвристику `:focus-visible` ведёт браузер — фокус от Tab видимый, от нажатия
 * мышью на кнопку нет, — и юнит-тесты плагина
 * (`plugins/__tests__/tooltip-trigger.plugin.spec.ts`) задают её сами. Здесь —
 * что плагин верно читает настоящую. Раскладку jsdom тоже не считает: зазор
 * между триггером и панелью, путь курсора через него и то, что у выключенной
 * кнопки (`pointer-events: none`) курсор попадает в корень, видны только здесь.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { Button, Tooltip } from '@soldy-ui/vue'
import type { ITooltipProps } from '@soldy-ui/core'
import type { DescriptorSlots, TooltipDescriptor } from '@soldy-ui/setup'

import '@soldy-ui/theme-oren'

type TTriggerScope = DescriptorSlots<typeof TooltipDescriptor>['trigger']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Подсказка у кнопки между двумя кнопками страницы — чтобы было откуда прийти
 * по Tab. Сверху отступ: подсказка встаёт над триггером.
 */
const page = (props: Partial<ITooltipProps> = {}, disabled = false) =>
	h('div', { style: 'padding: 80px 40px' }, [
		h('button', { class: 's-test-before' }, 'До'),
		h(Tooltip, props, {
			trigger: ({ triggerAria }: TTriggerScope) =>
				h(Button, { text: 'Сохранить', class: 's-test-trigger', disabled, ...triggerAria }),
			default: () => 'Сохранить черновик',
		}),
		h('button', { class: 's-test-after' }, 'После'),
	])

/** Разметка на странице, корень объявлен плагинам: `TElementPlugin` ждёт кадр. */
const show = async (props: Partial<ITooltipProps> = {}, disabled = false) => {
	render(defineComponent({ render: () => page(props, disabled) }))

	await nextTick()
	await nextFrame()
	await nextFrame()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const root = () => find('.s-tooltip')
const trigger = () => find('.s-test-trigger')
const panel = () => find('.s-tooltip__panel')
const isOpen = () => getComputedStyle(panel()).display !== 'none'

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'
	// Курсор с прошлого теста остался там, где его оставили, а разметка
	// встанет на то же место: уводим его, чтобы заход курсора был заходом
	await userEvent.unhover(document.body)
})

afterEach(() => {
	cleanup()
})

describe('фокус', () => {
	/**
	 * Задержка показа — десять секунд: подсказка, открывшаяся раньше, открыта
	 * фокусом, а не курсором, который Playwright ведёт к кнопке при клике.
	 */
	const LONG = { openDelay: 10_000 }

	it('Tab на триггер показывает подсказку сразу', async () => {
		await show(LONG)

		find('.s-test-before').focus()
		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(trigger())
		expect(trigger().matches(':focus-visible')).toBe(true)
		await expect.poll(isOpen, { timeout: 500 }).toBe(true)
	})

	it('клик мышью фокусирует триггер, но подсказку не показывает', async () => {
		await show(LONG)
		await userEvent.click(trigger())

		expect(document.activeElement).toBe(trigger())
		expect(trigger().matches(':focus-visible')).toBe(false)

		await wait(300)

		expect(isOpen()).toBe(false)
	})

	it('Tab с триггера дальше прячет подсказку сразу', async () => {
		await show(LONG)

		find('.s-test-before').focus()
		await userEvent.keyboard('{Tab}')
		await expect.poll(isOpen, { timeout: 500 }).toBe(true)

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(find('.s-test-after'))
		await expect.poll(isOpen, { timeout: 100 }).toBe(false)
	})
})

describe('курсор', () => {
	it('панель — в 6px над триггером, по его центру', async () => {
		await show({ openDelay: 0 })
		await userEvent.hover(trigger())
		await expect.poll(isOpen).toBe(true)

		const anchor = root().getBoundingClientRect()
		const box = panel().getBoundingClientRect()

		expect(Math.round(anchor.top - box.bottom)).toBe(6)
		expect(box.left + box.width / 2).toBeCloseTo(anchor.left + anchor.width / 2, 0)
		expect(panel().dataset.placement).toBe('top')
	})

	it('курсор через зазор на панель подсказку не закрывает', async () => {
		// Задержка скрытия — своя, с запасом, а не умолчание в 150 мс. Зазор
		// курсор проходит двумя действиями `userEvent`, и каждое — заход в
		// Playwright, который перед наведением ещё ждёт устойчивого
		// прямоугольника панели. Сколько длится проход, тест не решает: даже
		// на быстрой машине он занимает больше 100 мс, а на машине CI
		// подсказка закрывалась раньше, чем курсор доходил до панели, и
		// наведение ждало её до таймаута. Умолчание — решение компонента, его
		// таймер стережёт юнит-тест плагина; здесь — зазор настоящей раскладки
		// и панель под курсором.
		const CLOSE_DELAY = 600

		await show({ openDelay: 0, closeDelay: CLOSE_DELAY })
		await userEvent.hover(trigger())
		await expect.poll(isOpen).toBe(true)

		// Точка в зазоре — над триггером, под панелью: курсор ушёл с корня,
		// но на панель ещё не попал. Там его держит задержка скрытия
		await userEvent.hover(root(), { position: { x: 8, y: -3 }, force: true })
		await wait(60)
		await userEvent.hover(panel())
		// Дольше задержки скрытия: закрыть было бы уже пора
		await wait(CLOSE_DELAY + 200)

		expect(isOpen()).toBe(true)

		await userEvent.unhover(panel())

		// Скрытие — через ту же задержку: из секунды, которую `expect.poll`
		// ждёт по умолчанию, на медленной машине осталось бы мало
		await expect.poll(isOpen, { timeout: CLOSE_DELAY + 1000 }).toBe(false)
	})

	it('у выключенной кнопки подсказка показывается: курсор попадает в корень', async () => {
		await show({ openDelay: 0 }, true)

		expect(getComputedStyle(trigger()).pointerEvents).toBe('none')

		// Курсор — в центр кнопки; принимает его корень под ней
		await userEvent.hover(trigger(), { force: true })

		await expect.poll(isOpen).toBe(true)
	})
})
