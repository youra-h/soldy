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
import { Scroller } from '@soldy-ui/vue'

import { expectClearOfFades, expectFocusedClearOfFades, fades } from './fades'

import '@soldy-ui/theme-oren'

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

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

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

/**
 * Подсказка у края гасит содержимое, и элемент под фокусом не вправе остаться
 * под ней. Сам браузер при фокусе докручивает только элемент, целиком ушедший
 * из окна снапа, а частично видимый оставляет у края — поэтому доводит его
 * плагин ленты (`TScrollerViewportPlugin`), в окно снапа. Окно тема делает
 * чистой частью ленты, между подсказками (`scroll-padding-inline` в
 * `scroller/_scroller.scss`). Без доводки кнопка у края уходила под подсказку
 * на 11–50px, а при обратном ходе от неё оставалось видно полпикселя.
 *
 * Проверяется каждая кнопка — сначала вперёд, потом обратно: у края под
 * подсказкой оказывается то следующая, то предыдущая. Обход — клавиатурой,
 * как ходит пользователь: плагин доводит только фокус с клавиатуры
 * (`:focus-visible`), а `focus()` из скрипта после нажатия мышью в соседнем
 * тесте браузер видимым не считает.
 */
describe('элемент под фокусом не остаётся под подсказкой', () => {
	/** Кнопок столько, что лента листается на несколько страниц в обе стороны. */
	const STOPS = [...ITEMS, 'Седьмой', 'Восьмой']

	/** Узкая лента, в которой каждый элемент — остановка Tab. */
	const stops = (dir: 'ltr' | 'rtl') =>
		defineComponent({
			render() {
				return h('div', { class: 's-host', dir, style: `width: ${NARROW}px` }, [
					h(Scroller, null, () =>
						STOPS.map((text) =>
							h(
								'button',
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

	/**
	 * Клавиша — и ждём, пока лента уляжется: прокрутка от фокуса мгновенная,
	 * но края замер пишет кадром позже, и маска меняется вслед за ними.
	 */
	const press = async (keys: string) => {
		await userEvent.keyboard(keys)
		await nextFrame()
		await nextFrame()
	}

	it.each(['ltr', 'rtl'] as const)(
		'%s: каждая кнопка под фокусом — в чистой части, Tab вперёд и обратно',
		async (dir) => {
			render(stops(dir))

			await settled(canNext, 'true')

			const buttons = [...viewport().querySelectorAll('button')]

			expect(buttons, 'кнопок в ленте').toHaveLength(STOPS.length)

			// Кнопка «назад» в начале строки выключена, и первый Tab ведёт
			// сразу в ленту
			for (const [index, button] of buttons.entries()) {
				await press('{Tab}')

				expectFocusedClearOfFades(button, viewport(), `кнопка ${index}`)
			}

			for (const [index, button] of [...buttons.entries()].reverse().slice(1)) {
				await press('{Shift>}{Tab}{/Shift}')

				expectFocusedClearOfFades(button, viewport(), `кнопка ${index}, обратно`)
			}
		},
	)

	/**
	 * Нажатие мышью элемент не доводит: лента, сдвинувшаяся между нажатием и
	 * отпусканием, увела бы кнопку из-под указателя, и `click` до неё не
	 * дошёл бы. Фокус от нажатия браузер видимым не считает, и плагин его
	 * пропускает.
	 *
	 * Кнопка — на краю окна снапа: частью в чистой части ленты, частью под
	 * подсказкой, то есть такая, какую плагин довёл бы. Нажатие — у края её
	 * части в окне: точку за окном Playwright перед нажатием докрутил бы сам, и
	 * ленту сдвинул бы не плагин. А у края — чтобы доводка, сдвинь она ленту,
	 * подставила под отпускание соседнюю кнопку.
	 */
	it('нажатие мышью по кнопке у края доходит, и лента не сдвигается', async () => {
		render(stops('ltr'))

		await settled(canNext, 'true')

		const edge = viewport().getBoundingClientRect().right - fades(viewport()).right
		const button = [...viewport().querySelectorAll('button')].find((candidate) => {
			const box = candidate.getBoundingClientRect()

			return box.left < edge - 8 && box.right > edge + 0.5
		})

		if (!button) throw new Error('на краю окна нет кнопки')

		let clicks = 0

		button.addEventListener('click', () => clicks++)

		const box = button.getBoundingClientRect()

		await userEvent.click(button, { position: { x: edge - box.left - 4, y: box.height / 2 } })
		await nextFrame()
		await nextFrame()

		// Фокус от нажатия был — плагину было на что отозваться
		expect(document.activeElement, 'фокус').toBe(button)
		expect(clicks, 'нажатий дошло').toBe(1)
		expect(viewport().scrollLeft, 'положение ленты').toBe(0)
	})

	/**
	 * Страница, до которой снап доводит листание, встаёт за подсказкой, а не под
	 * ней: элемент в её начале виден целиком. Это та же чистая часть — окно
	 * снапа, по которому ставится и страница, и элемент под фокусом.
	 */
	it.each(['ltr', 'rtl'] as const)(
		'%s: после «вперёд» элемент у начала ленты — в чистой части',
		async (dir) => {
			render(harness(NARROW, dir))

			await settled(canNext, 'true')

			// Прокрутка плавная, а снап доводит её в самом конце: ждём конца
			const scrolled = new Promise((resolve) =>
				viewport().addEventListener('scrollend', resolve, { once: true }),
			)

			await userEvent.click(next())
			await scrolled
			await settled(canPrev, 'true')
			await nextFrame()
			await nextFrame()

			const area = viewport().getBoundingClientRect()
			const fade = fades(viewport())

			// Элемент у начала — первый, что заходит в чистую часть. Снап ставит
			// ленту на целый пиксель, а границы элементов дробные, и предыдущий
			// заходит в неё на субпиксель: такой не в счёт. Начало строки в RTL —
			// правый край
			const first = [...viewport().children].find((item) => {
				const box = item.getBoundingClientRect()

				return dir === 'ltr'
					? box.right > area.left + fade.left + 0.5
					: box.left < area.right - fade.right - 0.5
			})

			if (!first) throw new Error('в чистой части ленты нет ни одного элемента')

			// Подсказки у начала нет — и встать за неё проверка не требует
			expect(dir === 'ltr' ? fade.left : fade.right, 'подсказка у начала').toBeGreaterThan(0)
			expectClearOfFades(first, viewport(), 'элемент у начала ленты')
		},
	)
})
