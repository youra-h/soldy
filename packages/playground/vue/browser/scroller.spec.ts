/**
 * Лента со стрелками в настоящем браузере.
 *
 * Здесь проверяется то, чего нет нигде больше: раскладка и прокрутка. В jsdom
 * у вьюпорта нет ни ширины, ни `scrollLeft`, поэтому «есть ли куда листать» и
 * «на сколько двигает кнопка» там не вопрос вовсе. Края считает
 * `TScrollerViewportPlugin` по трём числам вьюпорта, шаг — видимая ширина, а
 * доводку до границы элемента делает снап из
 * `themes/oren/src/components/scroller/_scroller.scss`.
 *
 * Сторож ошибок окна (`browser/setup.ts`) здесь работает как второй тест:
 * замер, который гоняется за собственным результатом, уронил бы прогон
 * сообщением `ResizeObserver loop completed with undelivered notifications`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Scroller } from '@soldy/ui-vue'

import '@soldy/theme-oren'

/** Содержимое заведомо шире узкой ленты и заведомо уже широкой. */
const ITEMS = ['Первый', 'Второй', 'Третий', 'Четвёртый', 'Пятый', 'Шестой']

/** Ширина, на которой содержимое не помещается. */
const NARROW = 260

/** Ширина, на которой помещается всё. */
const WIDE = 900

const harness = (width: number, dir: 'ltr' | 'rtl' = 'ltr', props: Record<string, unknown> = {}) =>
	defineComponent({
		render() {
			return h('div', { class: 's-host', dir, style: `width: ${width}px` }, [
				h(Scroller, props, () =>
					ITEMS.map((text) =>
						h(
							'span',
							{
								key: text,
								class: 's-test-item',
								style: 'padding: 4px 12px; white-space: nowrap',
							},
							text,
						),
					),
				),
			])
		},
	})

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const root = () => find('.s-scroller')
const viewport = () => find('.s-scroller__viewport')
const prev = () => find('.s-scroller__prev')
const next = () => find('.s-scroller__next')

/** Признаки для темы — они же то, что намерил плагин. */
const canPrev = () => root().dataset.canPrev
const canNext = () => root().dataset.canNext

/** Замер идёт кадрами, а прокрутка плавная: состояние читаем через poll. */
const settled = (fact: () => unknown, expected: unknown) => expect.poll(fact).toBe(expected)

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('узкая лента: содержимое не помещается', () => {
	it('в начале строки листается только вперёд', async () => {
		render(harness(NARROW))

		await settled(canNext, 'true')

		expect(canPrev()).toBe('false')
		expect(prev().hasAttribute('disabled')).toBe(true)
		expect(next().hasAttribute('disabled')).toBe(false)
	})

	/**
	 * Шаг — страница, а не элемент: элемент здесь около 90px, то есть меньше
	 * половины видимой ширины, и шагом «на элемент» лента не доехала бы даже
	 * до её середины. Точное число задаёт снап — он доводит страницу до
	 * границы элемента, чтобы не обрезать его посередине.
	 */
	it('кнопка «вперёд» двигает ленту на видимую ширину', async () => {
		render(harness(NARROW))

		await settled(canNext, 'true')

		const page = viewport().clientWidth

		await userEvent.click(next())
		await expect.poll(() => viewport().scrollLeft).toBeGreaterThan(page / 2)

		expect(viewport().scrollLeft).toBeLessThan(page * 2)
	})

	it('на конце строки гаснет «вперёд», а «назад» оживает', async () => {
		render(harness(NARROW))

		await settled(canNext, 'true')

		viewport().scrollLeft = viewport().scrollWidth

		await settled(canNext, 'false')

		expect(canPrev()).toBe('true')
		expect(next().hasAttribute('disabled')).toBe(true)
		expect(prev().hasAttribute('disabled')).toBe(false)
	})

	it('кнопка «назад» двигает ленту в обратную сторону', async () => {
		render(harness(NARROW))

		await settled(canNext, 'true')

		viewport().scrollLeft = viewport().scrollWidth

		await settled(canPrev, 'true')

		const end = viewport().scrollLeft

		await userEvent.click(prev())
		await expect.poll(() => viewport().scrollLeft).toBeLessThan(end)
	})
})

describe('широкая лента: листать нечего', () => {
	it('оба признака false, и кнопок в ряду нет', async () => {
		render(harness(WIDE))

		await settled(canNext, 'false')

		expect(canPrev()).toBe('false')
		expect(prev().getBoundingClientRect().width).toBe(0)
		expect(next().getBoundingClientRect().width).toBe(0)
	})

	/** Место снятых кнопок уходит содержимому, и оно тем более помещается. */
	it('состояние устойчиво: снятые кнопки не возвращают «есть что листать»', async () => {
		render(harness(WIDE))

		await settled(canNext, 'false')
		await new Promise((resolve) => setTimeout(resolve, 100))

		expect(canNext()).toBe('false')
		expect(canPrev()).toBe('false')
	})
})

describe('правое-левое письмо', () => {
	/**
	 * Начало строки в RTL — правый край, и лента уезжает от него в минус.
	 * Знак шага берётся у вычисленного направления, а не у пропа.
	 */
	it('«вперёд» уводит ленту влево', async () => {
		render(harness(NARROW, 'rtl'))

		await settled(canNext, 'true')

		expect(canPrev()).toBe('false')

		await userEvent.click(next())
		await expect.poll(() => viewport().scrollLeft).toBeLessThan(0)
	})
})

describe('прокручиваемая область достижима с клавиатуры', () => {
	/** Правило axe `scrollable-region-focusable`: у содержимого своих остановок нет. */
	it('вьюпорт становится остановкой Tab', async () => {
		render(harness(NARROW))

		await settled(() => viewport().getAttribute('tabindex'), '0')
	})

	it('со своей остановкой внутри лента её не добавляет', async () => {
		render(
			defineComponent({
				render() {
					return h('div', { class: 's-host', style: `width: ${NARROW}px` }, [
						h(Scroller, null, () =>
							ITEMS.map((text) =>
								h(
									'button',
									{ key: text, class: 's-test-item', style: 'padding: 4px 12px' },
									text,
								),
							),
						),
					])
				},
			}),
		)

		await settled(canNext, 'true')

		expect(viewport().hasAttribute('tabindex')).toBe(false)
	})
})
