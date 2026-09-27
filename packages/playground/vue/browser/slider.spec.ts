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
 * Переходы темы — тоже здесь: jsdom стилей не считает и переходов не заводит.
 *
 * Позиции — от левого верхнего угла дорожки: её коробка — ход центров ручек,
 * 0 и 1 доли — её края по оси (контракт темы с плагином указателя).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { TSlider } from '@soldy-ui/core'
import type { ISliderProps, TSliderValue } from '@soldy-ui/core'
import { Label, Slider } from '@soldy-ui/vue'

import { reducedMotion } from './media'
import { settled, transitionEvents, transitionRuns } from './transitions'

import '@soldy-ui/theme-oren'

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

type THarness = {
	/** Направление письма страницы */
	dir?: 'ltr' | 'rtl'
	/** Ползунок в подписи `Label` */
	label?: boolean
	/** Кнопка «До» перед ползунком — чтобы было откуда прийти по Tab */
	before?: boolean
}

/**
 * Ползунок на странице шириной 400 px. Значение держит экземпляр ядра: по нему
 * тест и читает результат жеста. Сверху отступ шире: подсказка `auto` встаёт
 * над ручкой, за коробкой ползунка.
 */
async function mount(
	props: Partial<ISliderProps> = {},
	{ dir = 'ltr', label = false, before = false }: THarness = {},
) {
	const ctrl = new TSlider(props)
	const slider = () => h(Slider, { ctrl })

	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: 'width: 400px; padding: 48px 24px 24px' }, [
					before ? h('button', { class: 's-test-before' }, 'До') : null,
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
const range = () => find('.s-slider__range')
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

/**
 * Заливка идёт вместе с ручкой. Ход позиций тема анимирует только вне
 * протяжки и без просьбы системы убрать движение — у ручки и у заливки
 * одинаково, иначе одна отстаёт от другой на длину перехода.
 *
 * Переходы ловит слушатель, повешенный до действия, а не снимок после него:
 * ответ Playwright на ввод идёт кругом RPC и может прийти позже, чем кончится
 * переход в 150 мс, — тогда и `getAnimations()`, и геометрия позеленели бы и
 * с отстающей заливкой.
 */
describe('заливка', () => {
	/** Насколько край заливки отстал от центра ручки, px. */
	const lag = () => Math.abs(range().getBoundingClientRect().right - centerX(thumbs()[0]))

	/**
	 * Фокус на поле первой ручки — нажатием на её центр, значение не
	 * меняется. События переходов от нажатия приходят раньше, чем тест повесит
	 * слушатель.
	 */
	const focusThumb = async () => {
		await userEvent.click(thumbs()[0])
		await transitionEvents()
	}

	afterEach(async () => {
		await reducedMotion('no-preference')
	})

	it('протяжка — край заливки под ручкой, без перехода', async () => {
		const ctrl = await mount({ value: 20 })
		const runs = transitionRuns(range())

		await userEvent.hover(track(), { position: along(0.2) })
		await commands.mouseDown()

		try {
			// Взялись за центр ручки — значение не прыгнуло
			expect(ctrl.value).toBe(20)

			await userEvent.hover(track(), { position: along(0.6) })

			expect(ctrl.value).toBe(60)
			expect(lag()).toBeLessThan(0.5)
		} finally {
			await commands.mouseUp()
		}

		await transitionEvents()

		expect(runs).toEqual([])
	})

	/**
	 * Положительный контроль: без него тест протяжки прошёл бы и у темы, где
	 * переход заливки просто удалили.
	 */
	it('клавиша — заливка едет переходом', async () => {
		const ctrl = await mount({ value: 20 })

		await focusThumb()

		const runs = transitionRuns(range())

		await userEvent.keyboard('{ArrowRight}')
		await transitionEvents()

		expect(ctrl.value).toBe(21)
		expect(runs).not.toEqual([])
	})

	it('система просит меньше движения — клавиша без перехода', async () => {
		await reducedMotion('reduce')

		const ctrl = await mount({ value: 20 })

		await focusThumb()

		const runs = transitionRuns(range())

		await userEvent.keyboard('{ArrowRight}')
		await transitionEvents()

		expect(ctrl.value).toBe(21)
		expect(runs).toEqual([])
	})
})

/**
 * Подсказка со значением — разметка внутри ручки, место и видимость ей даёт
 * тема. Что её рисует ядро и какой у неё текст, проверяет адаптер
 * (`ui/vue/__tests__/slider.spec.ts`); здесь — то, чего jsdom не считает:
 * раскладка, наведение, `:focus-visible` и захват указателя.
 */
describe('подсказка', () => {
	/** Подсказка ручки `index`; нет её — тест падает здесь. */
	function tooltip(index = 0): HTMLElement {
		const node = all('.s-slider__tooltip')[index]

		if (!node) throw new Error(`подсказки ${index} нет`)

		return node
	}

	/** Центр узла по вертикали — в координатах окна. */
	const centerY = (node: Element) => {
		const box = node.getBoundingClientRect()

		return box.top + box.height / 2
	}

	/** Насколько центр подсказки ушёл от центра первой ручки по оси `axis`, px. */
	const offCenter = (axis: 'x' | 'y') => {
		const center = axis === 'x' ? centerX : centerY

		return Math.abs(center(tooltip()) - center(thumbs()[0]))
	}

	/**
	 * Подсказка — дитя ручки и едет с ней по построению: и в протяжке, где
	 * ручка идёт за указателем, и в переходе темы после смены значения. Ширина
	 * плашки меняется с текстом, центр — нет.
	 */
	it('центр подсказки — на центре ручки: в протяжке и после смены значения', async () => {
		const ctrl = await mount({ value: 20, tooltip: 'always' })

		expect(offCenter('x')).toBeLessThan(0.5)

		await userEvent.hover(track(), { position: along(0.2) })
		await commands.mouseDown()

		try {
			await userEvent.hover(track(), { position: along(0.6) })

			expect(ctrl.dragging).toBe(true)
			expect(offCenter('x')).toBeLessThan(0.5)
		} finally {
			await commands.mouseUp()
		}

		ctrl.value = 100
		await nextFrame()

		expect(tooltip().textContent).toBe('100')
		expect(offCenter('x')).toBeLessThan(0.5)
	})

	/**
	 * Над ручкой — за ореолом: ореол (треть стороны ручки) появляется под
	 * наведением и на плашку не заходит. Подсказку, которая видна всегда,
	 * горизонтальный ползунок держит внутри своей коробки.
	 */
	it('горизонтальная — над ручкой за ореолом; always — в коробке ползунка', async () => {
		await mount({ value: 50, tooltip: 'always' })

		const tip = tooltip().getBoundingClientRect()
		const knob = thumbs()[0].getBoundingClientRect()
		const root = find('.s-slider').getBoundingClientRect()

		expect(knob.top - tip.bottom).toBeGreaterThan(knob.height / 3)
		expect(tip.top).toBeGreaterThanOrEqual(root.top - 0.5)
	})

	/** С конца строки стоят подписи меток — подсказка встаёт с её начала. */
	it('вертикальная — сбоку, со стороны начала строки; в RTL — зеркально', async () => {
		await mount({ value: 50, tooltip: 'always', orientation: 'vertical' })

		const ltr = tooltip().getBoundingClientRect()
		const ltrKnob = thumbs()[0].getBoundingClientRect()

		expect(ltrKnob.left - ltr.right).toBeGreaterThan(ltrKnob.width / 3)
		expect(offCenter('y')).toBeLessThan(0.5)

		cleanup()
		await mount({ value: 50, tooltip: 'always', orientation: 'vertical' }, { dir: 'rtl' })

		const rtl = tooltip().getBoundingClientRect()
		const rtlKnob = thumbs()[0].getBoundingClientRect()

		expect(rtl.left - rtlKnob.right).toBeGreaterThan(rtlKnob.width / 3)
		expect(offCenter('y')).toBeLessThan(0.5)
	})

	/**
	 * `auto`: когда показывать, решает тема — наведение на ручку, её нажатие,
	 * `data-dragging` и `:focus-visible` поля. Каждая причина проверяется при
	 * снятых остальных: иначе тест прошёл бы и без неё.
	 *
	 * Видна ли подсказка, тест смотрит, когда её переходы доиграли: гаснет
	 * плашка переходом, и всё это время она ещё видна. Ждать числом
	 * миллисекунд нельзя: наведение уходит с ручки не в миг действия, и
	 * переход, начатый позже, застал бы плашку ещё видимой.
	 *
	 * Перед нажатием мышью тест жмёт мышью кнопку «До». Фокус полю ручки
	 * плагин указателя ставит скриптом, а Chromium считает такой фокус
	 * видимым, если прошлый фокус пришёл не от мыши, — тогда подсказку держал
	 * бы `:focus-visible`, а не проверяемая причина.
	 */
	describe('auto', () => {
		/** Видна ли подсказка, когда её переходы доиграли. */
		const shown = async () => {
			await settled(tooltip())

			return getComputedStyle(tooltip()).visibility === 'visible'
		}

		/** Нажатие мышью на кнопку «До»: прошлый фокус — от мыши. */
		const pointerFocus = async () => {
			await userEvent.click(find('.s-test-before'))
		}

		const hovered = () => thumbs()[0].matches(':hover')

		beforeEach(async () => {
			// Курсор с прошлого теста остался там, где его оставили, а ползунок
			// встанет на то же место: уводим его в угол страницы
			await userEvent.hover(document.body, { position: { x: 0, y: 0 } })
		})

		/**
		 * Скрыта `visibility`, а не одной прозрачностью: прозрачная плашка
		 * ловила бы наведение, и подсказка всплывала бы от курсора над пустым
		 * местом у ручки.
		 */
		it('в покое скрыта; курсор там, где она стоит, её не показывает', async () => {
			await mount({ value: 50, tooltip: 'auto' })

			expect(await shown()).toBe(false)

			const body = document.body.getBoundingClientRect()

			await userEvent.hover(document.body, {
				position: { x: centerX(tooltip()) - body.left, y: centerY(tooltip()) - body.top },
			})
			await nextFrame()

			expect(hovered()).toBe(false)
			expect(await shown()).toBe(false)
		})

		/**
		 * Курсор, перешедший с ручки на подсказку, её не прячет (WCAG 1.4.13):
		 * подсказка — дитя ручки, и указатель она не гасит.
		 */
		it('курсор на ручке показывает, на самой подсказке — держит, ушёл — скрыта', async () => {
			await mount({ value: 50, tooltip: 'auto' })
			await userEvent.hover(thumbs()[0])

			expect(await shown()).toBe(true)

			await userEvent.hover(tooltip())

			expect(hovered()).toBe(true)
			expect(await shown()).toBe(true)

			await userEvent.hover(document.body, { position: { x: 0, y: 0 } })
			await expect.poll(hovered).toBe(false)

			expect(await shown()).toBe(false)
		})

		it('поле в фокусе с клавиатуры — видна; фокус ушёл — скрыта', async () => {
			await mount({ value: 50, tooltip: 'auto' }, { before: true })

			find('.s-test-before').focus()
			await userEvent.keyboard('{Tab}')

			expect(document.activeElement).toBe(field(0))
			expect(field(0).matches(':focus-visible')).toBe(true)
			expect(hovered()).toBe(false)
			expect(await shown()).toBe(true)

			field(0).blur()
			await nextFrame()

			expect(await shown()).toBe(false)
		})

		/**
		 * Нажатие захватывает указатель корнем, и наведение уходит с ручки на
		 * корень, а `data-dragging` ставит только первое движение. Держит
		 * подсказку нажатие ручки.
		 */
		it('ручку держат, не сдвинув, — видна', async () => {
			const ctrl = await mount({ value: 50, tooltip: 'auto' }, { before: true })

			await pointerFocus()
			await userEvent.hover(thumbs()[0])
			await commands.mouseDown()

			try {
				await expect.poll(hovered).toBe(false)

				expect(ctrl.dragging).toBe(false)
				expect(field(0).matches(':focus-visible')).toBe(false)
				expect(await shown()).toBe(true)
			} finally {
				await commands.mouseUp()
			}
		})

		/**
		 * Нажали мимо ручки: ручка прыгнула к указателю, но ни наведения, ни
		 * нажатия у неё нет — подсказку держит `data-dragging`.
		 */
		it('ручку тянут — видна', async () => {
			const ctrl = await mount({ value: 50, tooltip: 'auto' }, { before: true })

			await pointerFocus()
			await userEvent.hover(track(), { position: along(0.1) })
			await commands.mouseDown()

			try {
				await userEvent.hover(track(), { position: along(0.3) })

				expect(ctrl.dragging).toBe(true)
				expect(thumbs()[0].matches(':hover, :active')).toBe(false)
				expect(field(0).matches(':focus-visible')).toBe(false)
				expect(await shown()).toBe(true)
			} finally {
				await commands.mouseUp()
			}
		})
	})

	/**
	 * Подпись называет поле всем своим текстом, а подсказка лежит внутри неё.
	 * Её текст в имя не входит: подсказка под `aria-hidden`, значение
	 * объявляет само поле.
	 */
	it('в подписи Label имя поля — ровно текст подписи', async () => {
		await mount({ value: 50, tooltip: 'always' }, { label: true })

		expect(find('.s-label').contains(tooltip())).toBe(true)
		expect(tooltip().textContent).toBe('50')
		expect(page.getByRole('slider', { name: 'Цена', exact: true }).query()).toBe(field(0))
	})
})
