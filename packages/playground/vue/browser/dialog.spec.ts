/**
 * Dialog в настоящем браузере: раскладка и переход темы, действия браузера.
 *
 * Место, размер, отступ от краёв экрана и разворот раскладывает тема, без
 * замеров, — jsdom их не считает, и юнит-тесты
 * (`ui/vue/__tests__/dialog.spec.ts`) видят только классы и переменные. Здесь
 * — что из них выходит на экране: окно по центру и у сторон (логических — в
 * RTL `start` справа), на своём отступе от краёв, развёрнутое на весь экран,
 * длинное содержимое прокручивается в теле. Появление и исчезание — переходом
 * темы: окно проявляется и гаснет вместе с подложкой, на месте, и так при
 * любых настройках движения в системе. Прокрутка страницы, запертая под
 * окном, возвращается, когда окно исчезло, — вернись она на закрытии, окно
 * съехало бы вбок, пока гаснет.
 *
 * Действие `mousedown` jsdom тоже не выполняет: там видно лишь, что модель
 * фокуса его гасит. Здесь — что нажатие по подложке правда не уносит фокус:
 * ни возвращённый на кнопку, с которой открыли, ни оставшийся в окне, которое
 * закрывается только кнопкой. И что Tab ходит по кругу в порядке, который
 * ведёт сам браузер.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { Button, Dialog } from '@soldy-ui/vue'
import type { IDialogProps, TDialogPlacement } from '@soldy-ui/core'
import type { TDialogOffsetEvent } from '@soldy-ui/plugins'

import { reducedMotion } from './media'
import {
	durationOf,
	easingOf,
	settled,
	transitionOf,
	transitioning,
	whileLeaving,
} from './transitions'
import { expectClassicScrollbar } from './viewport'

import '@soldy-ui/theme-oren'

/**
 * Отступ окна от края экрана в теме oren: `calc(var(--spacing) * 4)`. Один на
 * место у стороны и на потолок размера.
 */
const GAP = 16

/** Ширина окна по умолчанию в теме oren: `32rem`. */
const DEFAULT_WIDTH = 512

/** Допуск на субпиксельное округление координат. */
const EPSILON = 1

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Содержимое с двумя остановками Tab. */
const inside = (): VNode[] => [
	h('button', { class: 's-test-first' }, 'Первая'),
	h('button', { class: 's-test-second' }, 'Вторая'),
]

type TPageOptions = {
	/** Страница выше экрана — с полосой прокрутки */
	tall?: boolean
}

/**
 * Страница с кнопкой, которая открывает окно, и окно на `v-model:visible`.
 * В подвале — ещё одна остановка Tab. Кроме пропсов окна — обработчики его
 * событий (`onLayout:offset:before`).
 */
const show = async (
	props: Partial<IDialogProps> & Record<string, unknown> = {},
	content: () => VNode[] = inside,
	{ tall = false }: TPageOptions = {},
) => {
	const shown = ref(false)

	render(
		defineComponent({
			render: () =>
				h('div', { style: tall ? 'padding: 40px; height: 3000px' : 'padding: 40px' }, [
					h(
						'button',
						{
							class: 's-test-opener',
							onClick: () => {
								shown.value = true
							},
						},
						'Открыть',
					),
					h(
						Dialog,
						{
							...props,
							visible: shown.value,
							'onUpdate:visible': (value: boolean) => {
								shown.value = value
							},
						},
						{
							title: () => 'Настройки',
							default: content,
							footer: () => h(Button, { text: 'Готово', class: 's-test-ok' }),
						},
					),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()

	return shown
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const panel = () => find('.s-dialog')
const backdrop = () => find('.s-dialog__backdrop')
const opener = () => find('.s-test-opener')
const isOpen = () => getComputedStyle(panel()).display !== 'none'
const active = () => document.activeElement

/** Открыть кнопкой страницы и дождаться, пока фокус уйдёт в окно. */
const open = async () => {
	await userEvent.click(opener())
	await expect.poll(active).toBe(find('.s-test-first'))
}

/**
 * Открыть событием в самой странице, а не через `userEvent`: переход читается
 * сразу после рендера и не успевает доиграть, как бы ни медлил прогон.
 */
const openInPage = async () => {
	opener().click()
	await nextTick()
}

/** Закрыть Escape — так же, событием в самой странице, у узла под фокусом. */
const escapeInPage = async () => {
	active()?.dispatchEvent(
		new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
	)
	await nextTick()
}

/** Видимая область — граница, от которой тема отсчитывает место окна. */
const viewport = () => ({
	width: document.documentElement.clientWidth,
	height: document.documentElement.clientHeight,
})

/** Отступы окна от четырёх краёв видимой области. */
const gaps = () => {
	const box = panel().getBoundingClientRect()
	const { width, height } = viewport()

	return {
		left: box.left,
		right: width - box.right,
		top: box.top,
		bottom: height - box.bottom,
	}
}

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'
	// Шире окна по умолчанию с отступами: иначе окно упёрлось бы в потолок по
	// ширине, и центр со сторонами выглядели бы одинаково
	await page.viewport(1000, 700)
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
})

describe('место', () => {
	it('по умолчанию — по центру экрана', async () => {
		await show()
		await open()

		const { left, right, top, bottom } = gaps()

		expect(Math.abs(left - right)).toBeLessThan(EPSILON)
		expect(Math.abs(top - bottom)).toBeLessThan(EPSILON)
		expect(left).toBeGreaterThan(GAP)
	})

	/**
	 * Окно прижато к своей стороне с отступом и стоит по центру другой оси.
	 * `start` и `end` — логические стороны: в RTL они меняются местами.
	 */
	it.each<[TDialogPlacement, 'ltr' | 'rtl', 'left' | 'right' | 'top' | 'bottom']>([
		['start', 'ltr', 'left'],
		['end', 'ltr', 'right'],
		['start', 'rtl', 'right'],
		['end', 'rtl', 'left'],
		['top', 'ltr', 'top'],
		['bottom', 'ltr', 'bottom'],
	])('%s в %s — у края %s', async (placement, direction, edge) => {
		await show({ placement, direction })
		await open()

		const box = gaps()
		const horizontal = edge === 'left' || edge === 'right'
		const [near, far] = horizontal ? [box.top, box.bottom] : [box.left, box.right]

		expect(Math.abs(box[edge] - GAP)).toBeLessThan(EPSILON)
		// По другой оси — по центру
		expect(Math.abs(near - far)).toBeLessThan(EPSILON)
	})
})

describe('размер', () => {
	it('ширина не задана — ширина темы, задана — своя', async () => {
		await show()
		await open()

		expect(Math.round(panel().getBoundingClientRect().width)).toBe(DEFAULT_WIDTH)

		cleanup()

		await show({ width: 400 })
		await open()

		expect(Math.round(panel().getBoundingClientRect().width)).toBe(400)
	})

	it('размер больше экрана упирается в экран с отступом', async () => {
		await show({ width: 5000, height: 5000 })
		await open()

		const { left, right, top, bottom } = gaps()

		expect(Math.abs(left - GAP)).toBeLessThan(EPSILON)
		expect(Math.abs(right - GAP)).toBeLessThan(EPSILON)
		expect(Math.abs(top - GAP)).toBeLessThan(EPSILON)
		expect(Math.abs(bottom - GAP)).toBeLessThan(EPSILON)
	})

	it('развёрнутое — на весь экран, место и размер не действуют', async () => {
		await show({ maximized: true, placement: 'end', width: 300 })
		await open()

		const box = panel().getBoundingClientRect()
		const { width, height } = viewport()

		expect(box.left).toBe(0)
		expect(box.top).toBe(0)
		expect(Math.round(box.width)).toBe(width)
		expect(Math.round(box.height)).toBe(height)
	})

	it('кнопка разворота разворачивает окно и возвращает ему размер', async () => {
		await show({ maximizable: true })
		await open()

		await userEvent.click(find('.s-dialog__maximize'))

		await expect
			.poll(() => Math.round(panel().getBoundingClientRect().width))
			.toBe(viewport().width)

		await userEvent.click(find('.s-dialog__maximize'))

		await expect
			.poll(() => Math.round(panel().getBoundingClientRect().width))
			.toBe(DEFAULT_WIDTH)
	})

	it('длинное содержимое прокручивается в теле, шапка и подвал на месте', async () => {
		await show({}, () => [...inside(), h('div', { style: 'height: 2000px' })])
		await open()

		const box = panel().getBoundingClientRect()
		const body = find('.s-dialog__body')
		const title = find('.s-dialog__title').getBoundingClientRect()
		const footer = find('.s-dialog__footer').getBoundingClientRect()

		expect(Math.abs(box.height - (viewport().height - 2 * GAP))).toBeLessThan(EPSILON)
		expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
		expect(title.top).toBeGreaterThanOrEqual(box.top)
		expect(footer.bottom).toBeLessThanOrEqual(box.bottom + EPSILON)
		expect(footer.height).toBeGreaterThan(0)
	})
})

/**
 * Отступ — поля области экрана, в которую тема вписывает окно: у центра окно
 * по центру области, у стороны — у её края, и во всех случаях область —
 * потолок размера. Проверяется окном больше экрана: оно упирается в потолок,
 * и зазоры до краёв экрана — это и есть отступы.
 */
describe('отступ', () => {
	/** Больше экрана с любым отступом: окно упирается в потолок. */
	const HUGE = { width: 5000, height: 5000 } as const

	/** Зазор до края совпал с ожидаемым в пределах допуска. */
	const near = (actual: number, expected: number) =>
		expect(Math.abs(actual - expected)).toBeLessThan(EPSILON)

	it('0 — окно-потолок вплотную к краям экрана', async () => {
		await show({ ...HUGE, offset: 0 })
		await open()

		const { left, right, top, bottom } = gaps()

		near(left, 0)
		near(right, 0)
		near(top, 0)
		near(bottom, 0)
	})

	it('число у центра — отступ со всех сторон', async () => {
		await show({ ...HUGE, offset: 40 })
		await open()

		const { left, right, top, bottom } = gaps()

		near(left, 40)
		near(right, 40)
		near(top, 40)
		near(bottom, 40)
	})

	it('число у центра окна меньше экрана его не двигает: окно по-прежнему по центру', async () => {
		await show({ offset: 40 })
		await open()

		const { left, right, top, bottom } = gaps()

		near(left, right)
		near(top, bottom)
	})

	/**
	 * У стороны окно стоит от своего края на отступ, а по другой оси — по
	 * центру. `start` и `end` — логические: в RTL меняются местами.
	 */
	it.each<[TDialogPlacement, 'ltr' | 'rtl', 'left' | 'right']>([
		['start', 'ltr', 'left'],
		['start', 'rtl', 'right'],
		['end', 'ltr', 'right'],
		['end', 'rtl', 'left'],
	])('число у %s в %s — от края %s', async (placement, direction, edge) => {
		await show({ placement, direction, offset: 40 })
		await open()

		const box = gaps()

		near(box[edge], 40)
		near(box.top, box.bottom)
	})

	it("'10%' — от экрана по своей оси: по горизонтали от ширины, по вертикали от высоты", async () => {
		await show({ ...HUGE, offset: '10%' })
		await open()

		const { left, right, top, bottom } = gaps()
		const { width, height } = viewport()

		near(left, width / 10)
		near(right, width / 10)
		near(top, height / 10)
		near(bottom, height / 10)
	})

	it('top из события сдвигает центр: окно по центру области, а не экрана', async () => {
		await show({
			offset: 20,
			'onLayout:offset:before': (event: TDialogOffsetEvent) => {
				event.top = 200
			},
		})
		await open()

		const { left, right, top, bottom } = gaps()

		// Поровну от краёв области — а они в 200 и 20 от краёв экрана
		near(top - 200, bottom - 20)
		near(left, right)
	})

	it('развёрнутое отступов не читает — на весь экран', async () => {
		await show({ maximized: true, offset: 50 })
		await open()

		const { left, right, top, bottom } = gaps()

		near(left, 0)
		near(right, 0)
		near(top, 0)
		near(bottom, 0)
	})
})

describe('подложка', () => {
	it('накрывает экран под окном: мимо окна нажатие приходится в неё', async () => {
		await show()
		await open()

		const box = panel().getBoundingClientRect()

		expect(document.elementFromPoint(4, 4)).toBe(backdrop())
		expect(
			panel().contains(
				document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2),
			),
		).toBe(true)
	})
})

describe('появление и исчезание', () => {
	/** Свойства, которые идут переходом, кроме `display`: тот только откладывает скрытие. */
	const moving = (element: Element) =>
		transitioning(element).filter((property) => property !== 'display')

	/** Длительность и кривая перехода прозрачности на узле. */
	const timingOf = (element: Element) => {
		const transition = transitionOf(element, 'opacity')

		return { duration: durationOf(transition), easing: easingOf(transition) }
	}

	/** Переход прозрачности у окна и подложки — в эту минуту. */
	const timings = () => ({ panel: timingOf(panel()), backdrop: timingOf(backdrop()) })

	/**
	 * Переход держит тема: `@starting-style` даёт показанным окну и подложке
	 * нулевую прозрачность, `allow-discrete` откладывает `display: none` до
	 * конца исчезания. Хуков под анимацию у кода нет — видно это по переходу
	 * на самих узлах.
	 */
	it('открытие — окно и подложка проявляются, закрытие — гаснут и только потом пропадают', async () => {
		await show()
		await openInPage()

		expect(transitioning(panel())).toContain('opacity')
		expect(transitioning(backdrop())).toContain('opacity')

		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())
		await settled(backdrop())
		await escapeInPage()

		// Гаснут: до конца перехода окно и подложка в документе, а не `display: none`
		for (const element of [panel(), backdrop()]) {
			expect(element.dataset.open).toBe('false')
			expect(transitioning(element)).toContain('opacity')
			expect(getComputedStyle(element).display).not.toBe('none')
		}

		await expect.poll(isOpen).toBe(false)
		await expect.poll(() => getComputedStyle(backdrop()).display).toBe('none')
	})

	/**
	 * Окно появляется на своём месте, а не выезжает, а разворот и размер
	 * меняются сразу. Переходом по всем свойствам поехали бы и они.
	 */
	it('переходит только прозрачность: окно не выезжает, разворот — сразу', async () => {
		await show({ maximizable: true })
		await openInPage()

		expect(moving(panel())).toEqual(['opacity'])
		expect(moving(backdrop())).toEqual(['opacity'])

		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())

		find('.s-dialog__maximize').click()
		await nextTick()

		expect(panel().dataset.maximized).toBe('true')
		expect(transitioning(panel())).toEqual([])
		expect(Math.round(panel().getBoundingClientRect().width)).toBe(viewport().width)
	})

	/**
	 * Затемнение — часть того же появления: начинается и кончается вместе с
	 * окном и идёт тем же темпом. Исчезание короче появления: закрытое окно
	 * не ждут.
	 */
	it('окно и подложка идут вместе, исчезание короче появления', async () => {
		await show()
		await openInPage()

		const entering = timings()

		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())
		await settled(backdrop())
		await escapeInPage()

		const leaving = timings()

		expect(entering.backdrop).toEqual(entering.panel)
		expect(leaving.backdrop).toEqual(leaving.panel)
		expect(leaving.panel.duration).toBeLessThan(entering.panel.duration)
	})

	/**
	 * Прозрачность — не движение: окно стоит на месте, и просьбу системы
	 * убрать движение переход не выполняет. Сторож решения: без него переход
	 * спрятали бы под `prefers-reduced-motion`, как ход ручек Slider.
	 */
	it('система просит меньше движения — окно всё равно проявляется и гаснет', async () => {
		await reducedMotion('reduce')
		await show()

		// Эмуляция действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

		await openInPage()

		expect(transitioning(panel())).toContain('opacity')
		expect(transitioning(backdrop())).toContain('opacity')

		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())
		await escapeInPage()

		// Гаснет: до конца перехода окно в документе
		expect(panel().dataset.open).toBe('false')
		expect(getComputedStyle(panel()).display).not.toBe('none')

		await expect.poll(isOpen).toBe(false)
	})
})

/**
 * Прокрутку страницы под окном запирает замок, и полоса прокрутки уходит
 * вместе с ней. Вернись она, едва окно закрыли, область просмотра сузилась бы,
 * и окно по центру съехало бы на полширины полосы, пока гаснет. Поэтому
 * прокрутка возвращается, когда окно исчезло.
 */
describe('прокрутка страницы', () => {
	/** Прокрутка страницы заперта: замок держит `overflow` у `html`. */
	const locked = () => getComputedStyle(document.documentElement).overflow === 'hidden'

	/** Рамка окна — место и размер. */
	const frame = () => {
		const { left, top, width, height } = panel().getBoundingClientRect()

		return { left, top, width, height }
	}

	it('пока окно гаснет, прокрутка заперта и окно на месте, а исчезло — прокрутка вернулась', async () => {
		await show({}, inside, { tall: true })

		// Полоса занимает место — иначе окну не от чего съезжать, и сторож пуст
		expectClassicScrollbar()

		await open()
		await settled(panel())

		const place = frame()

		await escapeInPage()

		const seen = await whileLeaving(panel(), () => {
			expect(locked(), 'прокрутка заперта').toBe(true)
			expect(frame(), 'окно на месте').toEqual(place)
		})

		// Окно застали гаснущим — иначе проверять было нечего
		expect(seen).toBeGreaterThan(1)

		await expect.poll(locked).toBe(false)
		expectClassicScrollbar()
	})

	/**
	 * Открытие перебивает переход закрытия. Замок так и лежит — его ещё не
	 * отпускали, — а следующее закрытие отпускает его один раз.
	 */
	it('открыли снова, пока окно гаснет: прокрутка заперта, следующее закрытие её возвращает', async () => {
		await show({}, inside, { tall: true })

		expectClassicScrollbar()

		await open()
		await settled(panel())
		await escapeInPage()
		await nextFrame()

		// Окно ещё гаснет — открытие перебьёт его переход
		expect(transitioning(panel())).toContain('opacity')

		await openInPage()
		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())

		// Перебитый переход отменён, а замок так и лежит
		expect(locked()).toBe(true)

		await escapeInPage()

		await expect.poll(isOpen).toBe(false)
		await expect.poll(locked).toBe(false)
	})
})

describe('фокус', () => {
	it('открытие уводит фокус на первую остановку содержимого, а не на кнопки шапки', async () => {
		await show({ maximizable: true })
		await open()

		expect(active()).toBe(find('.s-test-first'))
	})

	it('Tab ходит по кругу: с крестика — снова на первую остановку', async () => {
		await show()
		await open()

		await userEvent.keyboard('{Tab}')
		expect(active()).toBe(find('.s-test-second'))

		await userEvent.keyboard('{Tab}')
		expect(active()).toBe(find('.s-test-ok'))

		await userEvent.keyboard('{Tab}')
		expect(active()).toBe(find('.s-dialog__close'))

		await userEvent.keyboard('{Tab}')
		expect(active()).toBe(find('.s-test-first'))

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
		expect(active()).toBe(find('.s-dialog__close'))
	})

	it('Escape закрывает и возвращает фокус на кнопку, с которой открыли', async () => {
		await show()
		await open()

		await userEvent.keyboard('{Escape}')

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(opener())
	})

	it('крестик закрывает и возвращает фокус', async () => {
		await show()
		await open()

		await userEvent.click(find('.s-dialog__close'))

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(opener())
	})

	/**
	 * Окно закрывается ещё на `pointerdown`, и фокус возвращается сразу. Не
	 * погаси модель фокуса `mousedown` этого нажатия — его действие унесло бы
	 * возвращённый фокус на `body`.
	 */
	it('нажатие по подложке закрывает, и фокус остаётся на кнопке, с которой открыли', async () => {
		await show()
		await open()

		await userEvent.click(backdrop(), { position: { x: 4, y: 4 } })

		await expect.poll(isOpen).toBe(false)
		expect(active()).toBe(opener())
	})

	/**
	 * Окно, которое закрывается только кнопкой, нажатие по подложке не
	 * закрывает — и фокус из него не уходит: с `body` Tab повёл бы на
	 * страницу под окном.
	 */
	it('dismissible: false — нажатие по подложке фокус из окна не уводит, Tab остаётся в окне', async () => {
		await show({ dismissible: false })
		await open()

		await userEvent.click(backdrop(), { position: { x: 4, y: 4 } })

		expect(isOpen()).toBe(true)
		expect(active()).toBe(find('.s-test-first'))

		await userEvent.keyboard('{Tab}')

		expect(active()).toBe(find('.s-test-second'))
	})
})
