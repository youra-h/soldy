/**
 * Ползунок в настоящем браузере: раскладка и настоящий ввод.
 *
 * jsdom не считает раскладку — у дорожки там нет ни ширины, ни положения, — и
 * не выполняет действий браузера: нативный сдвиг поля от стрелки и действие
 * подписи `Label` на `click` он не делает вовсе. Поэтому жест здесь — настоящим
 * вводом Playwright (`userEvent` с позицией), а не синтетическим
 * `PointerEvent`: только так видно, что нажатие гасит выделение и фокус
 * браузера, захват указателя доводит отпускание до корня, а стрелка делает
 * ровно один шаг — ядра, без нативного.
 *
 * Позиции — от левого верхнего угла дорожки: её коробка — ход центров ручек,
 * 0 и 1 доли — её края по оси (контракт темы с плагином указателя).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { TSlider } from '@soldy-ui/core'
import type { ISliderProps, TSliderValue } from '@soldy-ui/core'
import { Label, Slider } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type THarness = {
	/** Направление письма страницы */
	dir?: 'ltr' | 'rtl'
	/** Ползунок в подписи `Label` */
	label?: boolean
}

/**
 * Ползунок на странице шириной 400 px. Значение держит экземпляр ядра: по нему
 * тест и читает результат жеста.
 */
async function mount(
	props: Partial<ISliderProps> = {},
	{ dir = 'ltr', label = false }: THarness = {},
) {
	const ctrl = new TSlider(props)
	const slider = () => h(Slider, { ctrl })

	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: 'width: 400px; padding: 24px' }, [
					label ? h(Label, { text: 'Цена', position: 'top' }, slider) : slider(),
				]),
		}),
	)

	// Плагины получают корень кадром
	await nextFrame()
	await nextFrame()

	return ctrl
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)]
const track = () => find('.s-slider__track')
const thumbs = () => all('.s-slider__thumb')
const fields = () => all('.s-slider__input')

/** Поле ручки `index`; нет его — тест падает здесь. */
function field(index: number): HTMLInputElement {
	const node = fields()[index]

	if (!(node instanceof HTMLInputElement)) throw new Error(`поля ${index} нет`)

	return node
}

/**
 * Точка у доли хода `fraction` — от левого верхнего угла дорожки: по оси —
 * доля её длины, поперёк — середина.
 */
function along(fraction: number, orientation: 'horizontal' | 'vertical' = 'horizontal') {
	const box = track().getBoundingClientRect()

	return orientation === 'horizontal'
		? { x: box.width * fraction, y: box.height / 2 }
		: { x: box.width / 2, y: box.height * fraction }
}

/** Центр узла по горизонтали — в координатах окна. */
const centerX = (node: Element) => {
	const box = node.getBoundingClientRect()

	return box.left + box.width / 2
}

/**
 * Точка за ползунком: в 20 px от края дорожки — дальше отступа корня под
 * полручки, — на уровне её середины. Координаты — от левого верхнего угла
 * `body`: указатель уходит на страницу.
 */
function beyond(edge: 'left' | 'right') {
	const box = track().getBoundingClientRect()
	const page = document.body.getBoundingClientRect()
	const x = edge === 'left' ? box.left - 20 : box.right + 20

	return { x: x - page.left, y: box.top + box.height / 2 - page.top }
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('раскладка', () => {
	it('центр ручки — на своей доле дорожки; в RTL — от правого края', async () => {
		await mount({ value: 25 })

		const ltr = track().getBoundingClientRect()

		expect(Math.abs(centerX(thumbs()[0]) - (ltr.left + ltr.width * 0.25))).toBeLessThan(0.5)

		cleanup()
		await mount({ value: 25 }, { dir: 'rtl' })

		const rtl = track().getBoundingClientRect()

		expect(Math.abs(centerX(thumbs()[0]) - (rtl.right - rtl.width * 0.25))).toBeLessThan(0.5)
	})

	it('пустая подпись метки не видна, метка остаётся точкой', async () => {
		await mount({ value: 50, marks: [{ value: 0, label: 'Мин' }, { value: 50 }] })

		const [named, empty] = all('.s-slider__mark-label')

		expect(getComputedStyle(named).display).not.toBe('none')
		expect(getComputedStyle(empty).display).toBe('none')
	})
})

describe('нажатие на дорожке', () => {
	it('ставит ближайшую ручку в точку нажатия', async () => {
		const ctrl = await mount({ value: [10, 90] })

		await userEvent.click(track(), { position: along(0.3) })

		expect(ctrl.value).toEqual([30, 90])
	})

	it('RTL: ход растёт справа налево', async () => {
		const ctrl = await mount({ value: 0 }, { dir: 'rtl' })

		await userEvent.click(track(), { position: along(0.3) })

		expect(ctrl.value).toBe(70)
	})

	it('inverted: ход растёт в обратную сторону', async () => {
		const ctrl = await mount({ value: 0, inverted: true })

		await userEvent.click(track(), { position: along(0.3) })

		expect(ctrl.value).toBe(70)
	})

	it('вертикальный: ход растёт снизу вверх', async () => {
		const ctrl = await mount({ value: 0, orientation: 'vertical' })

		await userEvent.click(track(), { position: along(0.25, 'vertical') })

		expect(ctrl.value).toBe(75)
	})
})

describe('протяжка', () => {
	/**
	 * Взялись за ручку на 6 px правее центра — это полтора шага. Без
	 * смещения захвата значение прыгнуло бы к точке нажатия.
	 */
	it('ручка идёт за указателем со смещением захвата', async () => {
		const ctrl = await mount({ value: 50 })
		const from = along(0.5)
		const to = along(0.7)

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: { x: from.x + 6, y: from.y },
			targetPosition: { x: to.x + 6, y: to.y },
		})

		expect(ctrl.value).toBe(70)
	})

	/**
	 * Взялись за ручку на 6 px ближе к краю, к которому тянут, и увели
	 * указатель за ползунок. Ручка идёт со смещением захвата, и доля указателя,
	 * прижатая к краю дорожки, не довела бы её до края на эти 6 px.
	 */
	it('взятая не за середину ручка доходит до края хода, когда указатель за ползунком', async () => {
		const ctrl = await mount({ value: [10, 90] })
		const low = along(0.1)
		const high = along(0.9)

		await userEvent.dragAndDrop(track(), document.body, {
			sourcePosition: { x: high.x + 6, y: high.y },
			targetPosition: beyond('right'),
		})

		expect(ctrl.value).toEqual([10, 100])

		await userEvent.dragAndDrop(track(), document.body, {
			sourcePosition: { x: low.x - 6, y: low.y },
			targetPosition: beyond('left'),
		})

		expect(ctrl.value).toEqual([0, 100])
	})

	it('две ручки не перехлёстываются', async () => {
		const ctrl = await mount({ value: [20, 60] })

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.2),
			targetPosition: along(0.95),
		})

		expect(ctrl.value).toEqual([60, 60])
	})

	/**
	 * Отпустили над текстом подписи — вне ползунка, но внутри `label`. Без
	 * захвата указателя и без погашенного `click` подпись отдала бы фокус
	 * первому полю.
	 */
	it('в подписи Label фокус остаётся на тянутой ручке', async () => {
		const ctrl = await mount({ value: [20, 80] }, { label: true })

		await userEvent.dragAndDrop(track(), find('.s-label__text'), {
			sourcePosition: along(0.8),
		})

		expect(ctrl.values[0]).toBe(20)
		expect(document.activeElement).toBe(fields()[1])
	})
})

/**
 * Щелчок к меткам — настоящим вводом: радиус в px переводится в долю по
 * длине настоящей дорожки, доводку довозит переход темы, стоянку на метке
 * держат настоящие часы. Метка — 50, радиус по умолчанию — 8 px.
 */
describe('щелчок к меткам', () => {
	const MARK = [{ value: 50 }]

	/** Точка в `px` от метки вдоль дорожки: плюс — к `max`. */
	const nearMark = (px: number) => {
		const { x, y } = along(0.5)

		return { x: x + px, y }
	}

	/** Значение, в которое встала бы ручка без щелчка в точке `nearMark(px)`. */
	const freeValue = (px: number) =>
		Math.round((nearMark(px).x / track().getBoundingClientRect().width) * 100)

	it('magnet: в радиусе метки ручка встаёт на метку, за радиусом — нет', async () => {
		const ctrl = await mount({ value: 20, marks: MARK, snap: 'magnet' })

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.2),
			targetPosition: nearMark(-5),
		})

		expect(ctrl.value).toBe(50)

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.5),
			targetPosition: nearMark(-20),
		})

		expect(ctrl.value).toBe(freeValue(-20))
	})

	it('plateau: ручка стоит на метке, пока указатель на плато; край хода достижим', async () => {
		const ctrl = await mount({ value: 50, marks: MARK, snap: 'plateau' })

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.5),
			targetPosition: nearMark(6),
		})

		expect(ctrl.value).toBe(50)

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.5),
			targetPosition: along(1),
		})

		expect(ctrl.value).toBe(100)
	})

	it('settle: отпущенная в радиусе ручка доезжает до метки — один commit', async () => {
		const ctrl = await mount({ value: 20, marks: MARK, snap: 'settle' })
		const commits: unknown[] = []

		ctrl.events.on('commit', (payload) => commits.push(payload))

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.2),
			targetPosition: nearMark(-5),
		})

		expect(ctrl.value).toBe(50)
		expect(ctrl.dragging).toBe(false)
		expect(commits).toEqual([{ newValue: 50, oldValue: 20 }])
	})

	it('settle: за радиусом ручка остаётся, где отпустили', async () => {
		const ctrl = await mount({ value: 20, marks: MARK, snap: 'settle' })

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.2),
			targetPosition: nearMark(-20),
		})

		expect(ctrl.value).toBe(freeValue(-20))
	})

	it('hold: отпустили сразу за меткой — ручка осталась на метке', async () => {
		const ctrl = await mount({ value: 20, marks: MARK, snap: 'hold' })

		await userEvent.dragAndDrop(track(), track(), {
			sourcePosition: along(0.2),
			targetPosition: along(0.6),
		})

		expect(ctrl.value).toBe(50)
	})

	/**
	 * Кнопка зажата, указатель за меткой и стоит: ручка стоит на метке, а
	 * когда стоянка кончилась — догоняет его без единого движения указателя.
	 * Смены значения записаны со временем: так видна и сама стоянка, и её
	 * длина, как бы долго ни шёл ответ браузера тесту.
	 */
	it('hold: ручка стоит на пересечённой метке и догоняет стоящий указатель', async () => {
		const ctrl = await mount({ value: 20, marks: MARK, snap: 'hold' })
		const changes: Array<{ value: TSliderValue; at: number }> = []

		ctrl.events.on('change:value', ({ newValue }) =>
			changes.push({ value: newValue, at: performance.now() }),
		)

		await userEvent.hover(track(), { position: along(0.2) })
		await commands.mouseDown()

		try {
			await userEvent.hover(track(), { position: along(0.6) })
			await expect.poll(() => ctrl.value, { timeout: 2000 }).toBe(60)
		} finally {
			await commands.mouseUp()
		}

		const [held, caught] = changes

		expect(changes.map(({ value }) => value)).toEqual([50, 60])
		// Стоянка по умолчанию — 250 мс; запас — на огрубление часов
		expect(caught.at - held.at).toBeGreaterThanOrEqual(240)
	})
})

describe('клавиатура', () => {
	it('стрелка — ровно один шаг ядра: нативный сдвиг поля отменён', async () => {
		const ctrl = await mount({ value: 50 })

		await userEvent.click(thumbs()[0])
		expect(document.activeElement).toBe(fields()[0])

		await userEvent.keyboard('{ArrowRight}')

		expect(ctrl.value).toBe(51)
		await expect.poll(() => field(0).value).toBe('51')
	})

	it('RTL: → убавляет — ручка идёт туда, куда смотрит стрелка', async () => {
		const ctrl = await mount({ value: 50 }, { dir: 'rtl' })

		await userEvent.click(thumbs()[0])
		await userEvent.keyboard('{ArrowRight}')

		expect(ctrl.value).toBe(49)
	})
})
