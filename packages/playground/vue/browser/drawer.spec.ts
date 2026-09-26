/**
 * Drawer в настоящем браузере: раскладка темы, переход и жест указателем.
 *
 * Край, размер и место в контейнере раскладывает тема, без замеров, — jsdom
 * их не считает, и юнит-тесты (`ui/vue/__tests__/drawer.spec.ts`) видят только
 * классы, переменные и `data-*`. Здесь — что из них выходит на экране:
 * панель у своего края (логического — в RTL `start` справа), во всю высоту
 * или ширину, внутри контейнера — в его границах; въезд и выезд — переходом
 * темы: без вспышки в первых кадрах, подложка темнеет вместе с панелью, и
 * так при любых настройках движения в системе.
 *
 * Жест — настоящей мышью: захват указателя, `touch-action` и то, что нажатие
 * на полосу не уводит фокус, jsdom не выполняет вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { Drawer, Input } from '@soldy-ui/vue'
import type { IDrawerProps, TCloseEvent, TCloseReason, TDrawerPlacement } from '@soldy-ui/core'

import { reducedMotion } from './media'
import { durationOf, settled, transitionOf, transitioning } from './transitions'

import '@soldy-ui/theme-oren'

/** Ширина боковой панели по умолчанию в теме oren: `20rem`. */
const DEFAULT_WIDTH = 320

/** Полоса подложки, которую тема оставляет при любом размере панели: `3rem`. */
const GAP = 48

/** Зона захвата полосы жеста — не меньше 44px. */
const GRIP_ZONE = 44

/** Допуск на субпиксельное округление координат. */
const EPSILON = 1

/**
 * Первые кадры въезда, мс: шесть кадров при 60 Гц. Прошли к этому мгновению
 * панель и затемнение почти весь путь — въезд выглядит вспышкой.
 */
const FIRST_FRAMES = 100

/** Доля пути, дальше которой въезд за первые кадры — вспышка. */
const FLASH_SHARE = 2 / 3

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Содержимое с двумя остановками Tab. */
const inside = (): VNode[] => [
	h('button', { class: 's-test-first' }, 'Первая'),
	h('button', { class: 's-test-second' }, 'Вторая'),
]

type TShowOptions = {
	/** Панель в контейнере 600 × 300 с отступом от края страницы */
	contained?: boolean
	content?: () => VNode[]
	/** Подписчик `close:before` */
	onCloseBefore?: (event: TCloseEvent) => void
}

/**
 * Страница с кнопкой, которая открывает панель, и панель на `v-model:visible`
 * — на странице или в контейнере.
 */
const show = async (
	props: Partial<IDrawerProps> = {},
	{ contained = false, content = inside, onCloseBefore }: TShowOptions = {},
) => {
	const shown = ref(false)
	const reasons: TCloseReason[] = []

	const drawer = () =>
		h(
			Drawer,
			{
				...props,
				contained,
				visible: shown.value,
				'onUpdate:visible': (value: boolean) => {
					shown.value = value
				},
				'onClose:before': (event: TCloseEvent) => {
					reasons.push(event.reason)
					onCloseBefore?.(event)
				},
			},
			{ title: () => 'Фильтры', default: content },
		)

	render(
		defineComponent({
			render: () =>
				h('div', { style: 'padding: 40px' }, [
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
					contained
						? h(
								'div',
								{
									class: 's-test-host',
									style: 'position: relative; width: 600px; height: 300px; margin-top: 20px',
								},
								[drawer()],
							)
						: drawer(),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()

	return { shown, reasons }
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const panel = () => find('.s-drawer')
const backdrop = () => find('.s-drawer__backdrop')
const handle = () => find('.s-drawer__handle')
const opener = () => find('.s-test-opener')
const active = () => document.activeElement
const isOpen = () => getComputedStyle(panel()).display !== 'none'

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

/** Открыть кнопкой страницы, дождаться фокуса в панели и конца въезда. */
const open = async () => {
	await userEvent.click(opener())
	await expect.poll(active).toBe(find('.s-test-first'))
	await settled(panel())
}

/** Видимая область — граница, от которой тема отсчитывает край панели. */
const viewport = () => ({
	width: document.documentElement.clientWidth,
	height: document.documentElement.clientHeight,
})

/** Отступы панели от четырёх краёв области. */
const gaps = (
	box: DOMRect,
	area: { left: number; top: number; width: number; height: number },
) => ({
	left: box.left - area.left,
	right: area.left + area.width - box.right,
	top: box.top - area.top,
	bottom: area.top + area.height - box.bottom,
})

/** Протянуть мышью от точки узла на `dx`, `dy` — настоящими событиями, по шагам. */
const drag = (from: HTMLElement, dx: number, dy: number, steps = 10) => {
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

beforeEach(async () => {
	document.documentElement.dataset.theme = 'oren'
	await page.viewport(1000, 700)
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
})

describe('край', () => {
	/**
	 * Панель прижата к своему краю вплотную и тянется во всю другую ось.
	 * `start` и `end` — логические стороны: в RTL они меняются местами.
	 */
	it.each<[TDrawerPlacement, 'ltr' | 'rtl', 'left' | 'right' | 'top' | 'bottom']>([
		['end', 'ltr', 'right'],
		['start', 'ltr', 'left'],
		['end', 'rtl', 'left'],
		['start', 'rtl', 'right'],
		['top', 'ltr', 'top'],
		['bottom', 'ltr', 'bottom'],
	])('%s в %s — у края %s, во всю другую ось', async (placement, direction, edge) => {
		await show({ placement, direction })
		await open()

		const box = gaps(panel().getBoundingClientRect(), { left: 0, top: 0, ...viewport() })
		const horizontal = edge === 'left' || edge === 'right'
		const across = horizontal ? [box.top, box.bottom] : [box.left, box.right]

		expect(Math.abs(box[edge])).toBeLessThan(EPSILON)
		expect(across.every((gap) => Math.abs(gap) < EPSILON)).toBe(true)
	})
})

describe('размер', () => {
	it('боковая: ширина не задана — ширина темы, задана — своя', async () => {
		await show()
		await open()

		expect(Math.round(panel().getBoundingClientRect().width)).toBe(DEFAULT_WIDTH)

		cleanup()

		await show({ width: 400 })
		await open()

		expect(Math.round(panel().getBoundingClientRect().width)).toBe(400)
	})

	it('нижняя: высота по содержимому, задана — своя', async () => {
		await show({ placement: 'bottom' })
		await open()

		const auto = panel().getBoundingClientRect().height

		expect(auto).toBeGreaterThan(0)
		expect(auto).toBeLessThan(viewport().height / 2)

		cleanup()

		await show({ placement: 'bottom', height: 300 })
		await open()

		expect(Math.round(panel().getBoundingClientRect().height)).toBe(300)
	})

	it('больше экрана — упирается в экран без полосы подложки', async () => {
		await show({ width: 5000 })
		await open()

		expect(Math.round(panel().getBoundingClientRect().width)).toBe(viewport().width - GAP)
	})

	it('длинное содержимое прокручивается в теле, шапка на месте', async () => {
		await show(
			{ placement: 'bottom' },
			{ content: () => [...inside(), h('div', { style: 'height: 2000px' })] },
		)
		await open()

		const box = panel().getBoundingClientRect()
		const body = find('.s-drawer__body')

		expect(Math.abs(box.height - (viewport().height - GAP))).toBeLessThan(EPSILON)
		expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
		expect(find('.s-drawer__title').getBoundingClientRect().top).toBeGreaterThanOrEqual(box.top)
	})
})

describe('подложка', () => {
	it('накрывает экран под панелью: мимо панели нажатие приходится в неё', async () => {
		await show()
		await open()

		const box = panel().getBoundingClientRect()

		expect(document.elementFromPoint(4, 4)).toBe(backdrop())
		expect(panel().contains(document.elementFromPoint(box.left + 20, box.top + 200))).toBe(true)
	})
})

describe('внутри контейнера', () => {
	it('панель и подложка — в границах контейнера, страница за ним открыта', async () => {
		await show({}, { contained: true })
		await open()

		const host = find('.s-test-host').getBoundingClientRect()
		const box = gaps(panel().getBoundingClientRect(), host)
		const cover = backdrop().getBoundingClientRect()

		expect(Math.abs(box.right)).toBeLessThan(EPSILON)
		expect(Math.abs(box.top)).toBeLessThan(EPSILON)
		expect(Math.abs(box.bottom)).toBeLessThan(EPSILON)
		expect(Math.round(cover.width)).toBe(Math.round(host.width))
		expect(Math.round(cover.height)).toBe(Math.round(host.height))
		// Подложка не на весь экран: выше контейнера — страница
		expect(document.elementFromPoint(host.left + 4, host.top - 4)).not.toBe(backdrop())
		// Прокрутку документа панель в контейнере не запирает
		expect(getComputedStyle(document.documentElement).overflow).not.toBe('hidden')
	})
})

describe('въезд и выезд', () => {
	/**
	 * Переход держит тема: `@starting-style` даёт показанной панели
	 * положение за краем, `allow-discrete` откладывает `display: none` до
	 * конца выезда. Хуков под анимацию у кода нет — видно это по переходу на
	 * самой панели.
	 */
	it('открытие — панель въезжает переходом, закрытие — выезжает и только потом пропадает', async () => {
		await show()
		await openInPage()

		expect(transitioning(panel())).toContain('translate')

		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())
		await escapeInPage()

		// Выезжает: до конца перехода панель в документе, а не `display: none`
		expect(panel().dataset.open).toBe('false')
		expect(getComputedStyle(panel()).display).not.toBe('none')

		await expect.poll(isOpen).toBe(false)
	})

	/**
	 * Вспышка — это первые кадры: панель и затемнение к ним почти доехали. Так
	 * было с кривой vaul на 300 мс — под девять десятых пути за 100 мс. Порог —
	 * во времени, а не в доле длительности: так ловится и укороченная
	 * длительность. Переходы стоят на паузе, и мгновение выбирает тест, а не
	 * скорость прогона.
	 */
	it('въезд без вспышки: за первые 100 мс панель и затемнение не проходят двух третей пути', async () => {
		await show()
		await openInPage()

		const transitions = [
			transitionOf(panel(), 'translate'),
			transitionOf(backdrop(), 'opacity'),
		]

		// Путь панели — по её рамке: в вычисленном `translate` смесь процентов и px
		const look = () => ({
			edge: panel().getBoundingClientRect().left,
			shade: Number(getComputedStyle(backdrop()).opacity),
		})

		const at = (time: number) => {
			for (const transition of transitions) transition.currentTime = time

			return look()
		}

		for (const transition of transitions) transition.pause()

		const start = at(0)
		const early = at(FIRST_FRAMES)

		for (const transition of transitions) transition.finish()

		const end = look()
		const share = (key: 'edge' | 'shade') => (early[key] - start[key]) / (end[key] - start[key])

		// Путь начат — иначе проверка ниже прошла бы и на застывшей панели
		expect(share('edge')).toBeGreaterThan(0)
		expect(share('shade')).toBeGreaterThan(0)

		expect(share('edge')).toBeLessThanOrEqual(FLASH_SHARE)
		expect(share('shade')).toBeLessThanOrEqual(FLASH_SHARE)
	})

	/**
	 * Затемнение — часть того же движения: начинается и кончается вместе с
	 * панелью. Выезд короче въезда: закрытую панель не ждут.
	 */
	it('подложка идёт вместе с панелью, выезд короче въезда', async () => {
		const durations = () => ({
			panel: durationOf(transitionOf(panel(), 'translate')),
			backdrop: durationOf(transitionOf(backdrop(), 'opacity')),
		})

		await show()
		await openInPage()

		const entering = durations()

		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())
		await settled(backdrop())
		await escapeInPage()

		const leaving = durations()

		expect(entering.backdrop).toBe(entering.panel)
		expect(leaving.backdrop).toBe(leaving.panel)
		expect(leaving.panel).toBeLessThan(entering.panel)
	})

	/**
	 * Выезд одинаков при любых настройках системы — решение владельца: это
	 * обычный сдвиг панели от края, так панель открывается и закрывается.
	 * Сторож решения: без него переход снова спрятали бы под
	 * `prefers-reduced-motion`.
	 */
	it('система просит меньше движения — панель всё равно въезжает и выезжает', async () => {
		await reducedMotion('reduce')
		await show()

		// Эмуляция действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

		await openInPage()

		expect(transitioning(panel())).toContain('translate')
		expect(transitioning(backdrop())).toContain('opacity')

		await expect.poll(active).toBe(find('.s-test-first'))
		await settled(panel())
		await escapeInPage()

		// Выезжает: до конца перехода панель в документе
		expect(panel().dataset.open).toBe('false')
		expect(getComputedStyle(panel()).display).not.toBe('none')

		await expect.poll(isOpen).toBe(false)
	})
})

describe('жест', () => {
	it('полосы нет без жеста; с жестом зона захвата — не меньше 44px поперёк края', async () => {
		await show()

		expect(document.querySelector('.s-drawer__handle')).toBeNull()

		cleanup()

		await show({ swipe: 'handle' })
		await open()

		expect(handle().getBoundingClientRect().width).toBeGreaterThanOrEqual(GRIP_ZONE)

		cleanup()

		await show({ swipe: 'handle', placement: 'bottom' })
		await open()

		expect(handle().getBoundingClientRect().height).toBeGreaterThanOrEqual(GRIP_ZONE)
	})

	it('пока жест включён, касание вдоль оси — жесту: touch-action на панели', async () => {
		await show({ swipe: 'handle' })
		await open()

		expect(getComputedStyle(panel()).touchAction).toBe('pan-y pinch-zoom')

		cleanup()

		await show({ swipe: 'panel', placement: 'bottom' })
		await open()

		expect(getComputedStyle(panel()).touchAction).toBe('pan-x pinch-zoom')
	})

	it('нажатие на полосу фокус не уводит', async () => {
		await show({ swipe: 'handle' })
		await open()

		await userEvent.click(handle())

		expect(active()).toBe(find('.s-test-first'))
	})

	it('смахнули к краю за полосу — закрытие с причиной swipe, фокус возвращается', async () => {
		const { shown, reasons } = await show({ swipe: 'handle' })

		await open()
		await drag(handle(), 200, 0)

		await expect.poll(isOpen).toBe(false)
		expect(shown.value).toBe(false)
		expect(reasons).toEqual(['swipe'])
		expect(active()).toBe(opener())
	})

	it('RTL: панель у левого края смахивают влево', async () => {
		const { reasons } = await show({ swipe: 'handle', direction: 'rtl' })

		await open()
		await drag(handle(), -200, 0)

		await expect.poll(isOpen).toBe(false)
		expect(reasons).toEqual(['swipe'])
	})

	it('нижнюю — вниз', async () => {
		const { reasons } = await show({ swipe: 'handle', placement: 'bottom' })

		await open()
		await drag(handle(), 0, 200)

		await expect.poll(isOpen).toBe(false)
		expect(reasons).toEqual(['swipe'])
	})

	it('от края — не закрытие: панель возвращается на место', async () => {
		const { reasons } = await show({ swipe: 'handle' })

		await open()

		const edge = panel().getBoundingClientRect().right

		await drag(handle(), -200, 0)

		// Сдвиг уходит кадром позже, и панель едет на место переходом
		await expect
			.poll(() => Math.abs(panel().getBoundingClientRect().right - edge) < EPSILON)
			.toBe(true)

		expect(isOpen()).toBe(true)
		expect(reasons).toEqual([])
		expect(panel().style.getPropertyValue('--drawer-swipe')).toBe('')
	})

	it('отменённое close:before — панель остаётся и возвращается на место', async () => {
		const { reasons } = await show(
			{ swipe: 'handle' },
			{ onCloseBefore: (event) => event.preventDefault() },
		)

		await open()

		const left = panel().getBoundingClientRect().left

		await drag(handle(), 200, 0)

		await expect
			.poll(() => Math.abs(panel().getBoundingClientRect().left - left) < EPSILON)
			.toBe(true)

		expect(reasons).toEqual(['swipe'])
		expect(isOpen()).toBe(true)
		expect(panel().style.getPropertyValue('--drawer-swipe')).toBe('')
	})

	describe('за всю панель', () => {
		it('тянут за заголовок — закрытие', async () => {
			const { reasons } = await show({ swipe: 'panel' })

			await open()
			await drag(find('.s-drawer__title'), 200, 0)

			await expect.poll(isOpen).toBe(false)
			expect(reasons).toEqual(['swipe'])
		})

		it('из поля — нет: с контролом работают сами', async () => {
			const { reasons } = await show(
				{ swipe: 'panel' },
				{
					content: () => [
						...inside(),
						h(Input, { class: 's-test-input', placeholder: 'Поиск' }),
					],
				},
			)

			await open()
			await drag(find('.s-test-input input'), 200, 0)

			expect(isOpen()).toBe(true)
			expect(reasons).toEqual([])
		})
	})

	it('внутри контейнера жест тот же', async () => {
		const { reasons } = await show({ swipe: 'handle' }, { contained: true })

		await open()
		await drag(handle(), 200, 0)

		await expect.poll(isOpen).toBe(false)
		expect(reasons).toEqual(['swipe'])
	})
})

describe('закрытие', () => {
	it('крестик закрывает и возвращает фокус', async () => {
		const { reasons } = await show()

		await open()
		await userEvent.click(find('.s-drawer__close'))

		await expect.poll(isOpen).toBe(false)
		expect(reasons).toEqual(['button'])
		expect(active()).toBe(opener())
	})

	/**
	 * Панель закрывается ещё на `pointerdown`, и фокус возвращается сразу —
	 * модель фокуса гасит `mousedown` этого нажатия, как у окна.
	 */
	it('нажатие по подложке закрывает, фокус остаётся на кнопке, с которой открыли', async () => {
		const { reasons } = await show()

		await open()
		await userEvent.click(backdrop(), { position: { x: 4, y: 4 } })

		await expect.poll(isOpen).toBe(false)
		expect(reasons).toEqual(['outside'])
		expect(active()).toBe(opener())
	})
})
