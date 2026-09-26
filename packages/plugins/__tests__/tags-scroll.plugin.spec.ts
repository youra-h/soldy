// @vitest-environment jsdom

/**
 * Доводка тега под фокусом в окно ряда `scroll`.
 *
 * Счёт — общая доводка (`nearestShift`, её делит с рядом лента), и
 * проверяется он числами: субпиксели, оба края и элемент шире окна — то, что
 * в браузере дороже всего подобрать раскладкой. Окно здесь — [100, 300]:
 * паддинг-бокс ряда без `scroll-padding`. Сдвиг — как у `scrollBy`: на
 * сколько ряд уезжает влево. Направление письма доводке не нужно: ближайший
 * сдвиг одинаков в обе стороны.
 *
 * Проводка плагина — ниже, в jsdom: за какой режим и на какой фокус он
 * берётся и чем двигает ряд. Прямоугольники узлов jsdom не считает, их задаёт
 * тест. Настоящая раскладка и порядок событий браузера —
 * `playground/vue/browser/tags-overflow.spec.ts` и `select-tags.spec.ts`.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { TTags } from '@soldy-ui/core'
import type { TTagsOverflow } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TTagsScrollPlugin } from '../src'
import { nearestShift } from '../src/utils'
import type { TInlineSpan } from '../src/utils'

/** Окно всех расчётных случаев. */
const WINDOW: TInlineSpan = { left: 100, right: 300 }

const span = (left: number, right: number): TInlineSpan => ({ left, right })

/** Где окажется отрезок после сдвига ряда. */
const shifted = (box: TInlineSpan, shift: number): TInlineSpan =>
	span(box.left - shift, box.right - shift)

/** Сдвиг есть — иначе проверять, где что оказалось, нечего. */
const required = (shift: number | null): number => {
	if (shift === null) throw new Error('сдвига нет')

	return shift
}

describe('доводка: тег уже в окне', () => {
	it('ряд не трогаем', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(120, 180), item: span(110, 190) }),
		).toBeNull()
	})

	/** Ряд встаёт на целый пиксель, а края тегов дробные. */
	it.each([
		{ side: 'в начале', inside: span(99.6, 180), outside: span(99.4, 180) },
		{ side: 'в конце', inside: span(220, 300.4), outside: span(220, 300.6) },
	])('край, вышедший из окна $side на полпикселя, — ещё в окне', ({ inside, outside }) => {
		expect(nearestShift({ scrollWindow: WINDOW, focused: inside, item: inside })).toBeNull()
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: outside, item: outside }),
		).not.toBeNull()
	})
})

/**
 * Тег не шире окна встаёт в окно целиком — к ближнему краю: снапа у ряда нет,
 * и ставить тег к началу окна незачем.
 */
describe('доводка: тег не шире окна — к ближнему краю окна', () => {
	it('за краем в конце — конец тега у конца окна', () => {
		const item = span(260, 340)
		const shift = nearestShift({ scrollWindow: WINDOW, focused: span(310, 330), item })

		expect(shift).toBe(40)
		expect(shifted(item, required(shift)).right).toBe(WINDOW.right)
	})

	it('за краем в начале — начало тега у начала окна', () => {
		const item = span(60, 140)
		const shift = nearestShift({ scrollWindow: WINDOW, focused: span(70, 90), item })

		expect(shift).toBe(-40)
		expect(shifted(item, required(shift)).left).toBe(WINDOW.left)
	})

	/**
	 * Крестик в окне, а подпись тега — за краем. Кольцо в режиме выбора рисует
	 * пилюля, а крестик без подписи не скажет, какой тег он закроет: в окно
	 * встаёт весь тег.
	 */
	it('элемент под фокусом в окне, а тег нет — сдвиг до всего тега', () => {
		const item = span(40, 190)
		const shift = nearestShift({ scrollWindow: WINDOW, focused: span(160, 180), item })

		expect(shift).toBe(-60)
		expect(shifted(item, required(shift)).left).toBe(WINDOW.left)
	})
})

/**
 * Тег шире окна в него не встанет: он накрывает окно, а элемент под фокусом
 * лежит в окне. Из таких положений — ближайшее.
 */
describe('доводка: тег шире окна — накрывает окно', () => {
	/** Проверка результата: элемент под фокусом в окне, тег его накрывает. */
	const expectPlaced = (focused: TInlineSpan, item: TInlineSpan, shift: number) => {
		const placedFocus = shifted(focused, shift)
		const placedItem = shifted(item, shift)

		expect(placedFocus.left, 'элемент под фокусом: левый край').toBeGreaterThanOrEqual(
			WINDOW.left,
		)
		expect(placedFocus.right, 'элемент под фокусом: правый край').toBeLessThanOrEqual(
			WINDOW.right,
		)
		expect(placedItem.left, 'тег накрывает окно слева').toBeLessThanOrEqual(WINDOW.left)
		expect(placedItem.right, 'тег накрывает окно справа').toBeGreaterThanOrEqual(WINDOW.right)
	}

	/**
	 * Крестик в конце длинного тега за краем окна. С «началом тега к началу
	 * окна» крестик остался бы за краем, на [510, 540].
	 */
	it('крестик в конце встаёт у края окна', () => {
		const focused = span(560, 590)
		const item = span(150, 600)
		const shift = required(nearestShift({ scrollWindow: WINDOW, focused, item }))

		expect(shift).toBe(290)
		expectPlaced(focused, item, shift)
	})

	it('элемент у начала тега за краем в начале — встаёт у начала окна', () => {
		const focused = span(-390, -370)
		const item = span(-400, 250)
		const shift = required(nearestShift({ scrollWindow: WINDOW, focused, item }))

		expect(shift).toBe(-490)
		expectPlaced(focused, item, shift)
	})

	it('тег уже накрывает окно, и элемент под фокусом в нём — ряд не трогаем', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(250, 280), item: span(50, 450) }),
		).toBeNull()
	})
})

/**
 * Элемент под фокусом шире окна в него не встанет ни при каком сдвиге, и
 * больше всего его видно, когда он окно накрывает.
 */
describe('доводка: элемент под фокусом шире окна', () => {
	it('уже накрывает окно — ряд не трогаем', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(50, 350), item: span(40, 360) }),
		).toBeNull()
	})

	it('за краем — ближайшее положение, где он накрывает окно', () => {
		expect(
			nearestShift({ scrollWindow: WINDOW, focused: span(250, 550), item: span(240, 560) }),
		).toBe(150)
	})
})

/**
 * Без элемента области в окно доводится один элемент под фокусом: так «уже в
 * окне» смотрит лента (`resolveFocusShift`).
 */
describe('доводка: без элемента области', () => {
	it('элемент под фокусом в окне — сдвига нет', () => {
		expect(nearestShift({ scrollWindow: WINDOW, focused: span(160, 180) })).toBeNull()
	})

	it('за краем — к ближнему краю окна', () => {
		expect(nearestShift({ scrollWindow: WINDOW, focused: span(320, 350) })).toBe(50)
	})
})

/**
 * Проводка: за какой режим и на какой фокус плагин берётся и чем двигает ряд.
 *
 * Разметка — ряд и теги в нём, как их рисует Vue: пилюля, в ней строка и
 * крестик. Окно — [10, 290]: ряд [0, 300] без `scroll-padding` по 10 с каждой
 * стороны.
 */
describe('плагин: фокус в ряду', () => {
	const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

	/**
	 * `ResizeObserver` в jsdom не реализован. Плагину он не нужен, но заглушка
	 * страхует от соседа по набору, который его заведёт.
	 */
	beforeAll(() => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				unobserve(): void {}
				disconnect(): void {}
			},
		)
	})

	afterAll(() => {
		vi.unstubAllGlobals()
	})

	afterEach(() => {
		document.body.innerHTML = ''
	})

	/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
	const nodeOf = (selector: string): HTMLElement => {
		const node = document.querySelector(selector)

		if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

		return node
	}

	/** Прямоугольник узла по строке — jsdom его не считает. */
	const place = (node: Element, left: number, right: number) => {
		vi.spyOn(node, 'getBoundingClientRect').mockReturnValue(
			new DOMRect(left, 0, right - left, 20),
		)
	}

	/**
	 * Фокус, который браузер счёл бы видимым (`:focus-visible`) или нет.
	 * Видимость задаёт тест: эвристика jsdom своя, а плагину важен только
	 * ответ. Как его даёт браузер (Tab — да, нажатие мышью — нет), проверяет
	 * `playground/vue/browser/tags-overflow.spec.ts`.
	 */
	const focusWith = (target: HTMLElement, visible: boolean) => {
		vi.spyOn(target, 'matches').mockImplementation((selector: string) =>
			selector === ':focus-visible'
				? visible
				: Element.prototype.matches.call(target, selector),
		)
		target.focus()
	}

	async function mount(overflow: TTagsOverflow = 'scroll') {
		document.body.insertAdjacentHTML(
			'beforeend',
			`<div class="s-tags" style="scroll-padding-left: 10px; scroll-padding-right: 10px">
				<div class="s-tags-item first">
					<div class="first-row" tabindex="0">Москва</div>
					<button class="first-close">×</button>
				</div>
				<div class="s-tags-item second">
					<div class="second-row" tabindex="-1">Тверь</div>
					<button class="second-close">×</button>
				</div>
			</div>`,
		)

		const owner = new TTags({ overflow })
		const root = nodeOf('.s-tags')
		const scrollBy = vi.fn()

		place(root, 0, 300)
		Object.defineProperty(root, 'clientWidth', { value: 300 })
		// jsdom прокрутки не знает вовсе — сдвиг ловит шпион
		Object.defineProperty(root, 'scrollBy', { value: scrollBy })

		const bundle = new TPluginBundle(owner).use(TElementPlugin).use(TTagsScrollPlugin)
		const element = bundle.get(TElementPlugin)

		if (!element) throw new Error('узла корня нет')

		element.element = root
		// Корень плагины получают кадром позже
		await nextFrame()

		return { owner, bundle, root, scrollBy }
	}

	/** Второй тег у конца ряда виден частично: строка в окне, крестик — за краем. */
	const secondAtEnd = () => {
		place(nodeOf('.second'), 240, 320)
		place(nodeOf('.second-row'), 240, 290)
		place(nodeOf('.second-close'), 290, 310)
	}

	it('фокус с клавиатуры у края — ряд сдвигается сразу и мгновенно', async () => {
		const { scrollBy } = await mount()

		secondAtEnd()
		focusWith(nodeOf('.second-close'), true)

		// Синхронно, в обработчике `focusin`: без ожидания кадра
		expect(scrollBy).toHaveBeenCalledOnce()
		expect(scrollBy).toHaveBeenCalledWith({ left: 30, behavior: 'instant' })
	})

	/**
	 * Строка под фокусом в окне, а пилюля — за краем: кольцо в режиме выбора
	 * рисует она, и в окно встаёт тег целиком, а не строка.
	 */
	it('в окно встаёт тег — прямой ребёнок ряда, а не элемент под фокусом', async () => {
		const { scrollBy } = await mount()

		place(nodeOf('.first'), -20, 100)
		place(nodeOf('.first-row'), 15, 75)
		focusWith(nodeOf('.first-row'), true)

		expect(scrollBy).toHaveBeenCalledWith({ left: -30, behavior: 'instant' })
	})

	it('тег в окне — ряд стоит', async () => {
		const { scrollBy } = await mount()

		place(nodeOf('.first'), 10, 100)
		place(nodeOf('.first-close'), 70, 90)
		focusWith(nodeOf('.first-close'), true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/**
	 * Фокус от нажатия мышью: сдвинься ряд между нажатием и отпусканием, под
	 * указателем оказался бы другой тег, и `click` не дошёл бы.
	 */
	it('фокус не с клавиатуры — ряд стоит', async () => {
		const { scrollBy } = await mount()

		secondAtEnd()
		focusWith(nodeOf('.second-close'), false)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/** Ряд без своих остановок сам становится остановкой Tab: он и есть окно. */
	it('фокус на самом ряду — ряд стоит', async () => {
		const { root, scrollBy } = await mount()

		root.tabIndex = 0
		focusWith(root, true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/** В `wrap` и `popover` ряд не прокручивается, в `arrows` фокус доводит лента. */
	it.each(['wrap', 'popover', 'arrows'] as const)('%s — ряд стоит', async (overflow) => {
		const { scrollBy } = await mount(overflow)

		secondAtEnd()
		focusWith(nodeOf('.second-close'), true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	it('режим сменился — плагин берётся за ряд и отпускает его', async () => {
		const { owner, scrollBy } = await mount('wrap')
		const close = nodeOf('.second-close')

		secondAtEnd()

		owner.overflow = 'scroll'
		focusWith(close, true)

		expect(scrollBy).toHaveBeenCalledOnce()

		close.blur()
		owner.overflow = 'arrows'
		focusWith(close, true)

		expect(scrollBy).toHaveBeenCalledOnce()
	})

	it('после уничтожения набора фокус ряд не двигает', async () => {
		const { bundle, scrollBy } = await mount()

		bundle.destroy()
		secondAtEnd()
		focusWith(nodeOf('.second-close'), true)

		expect(scrollBy).not.toHaveBeenCalled()
	})
})
