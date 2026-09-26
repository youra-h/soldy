// @vitest-environment jsdom

/**
 * Доводка элемента под фокусом в окно снапа ленты.
 *
 * Счёт — чистая функция (`resolveFocusShift`), и проверяется он числами:
 * RTL, субпиксели и элемент шире окна — то, что в браузере дороже всего
 * подобрать раскладкой. Окно здесь — [100, 300]: паддинг-бокс вьюпорта без
 * `scroll-padding`. Сдвиг — как у `scrollBy`: на сколько лента уезжает влево.
 *
 * Проводка плагина — ниже, в jsdom: на какой фокус он отзывается и чем
 * двигает ленту. Прямоугольники узлов jsdom не считает, их задаёт тест.
 * Настоящая раскладка, снап и порядок событий браузера —
 * `playground/vue/browser/scroller.spec.ts` и `tags-overflow.spec.ts`.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll, vi } from 'vitest'
import { TScroller } from '@soldy-ui/core'
import { TElementPlugin, TPluginBundle, TScrollerViewportPlugin, resolveFocusShift } from '../src'
import type { TInlineSpan } from '../src'

/** Окно снапа всех расчётных случаев. */
const SNAPPORT: TInlineSpan = { left: 100, right: 300 }

const span = (left: number, right: number): TInlineSpan => ({ left, right })

/** Где окажется отрезок после сдвига ленты. */
const shifted = (box: TInlineSpan, shift: number): TInlineSpan =>
	span(box.left - shift, box.right - shift)

describe('элемент под фокусом уже в окне', () => {
	it.each([false, true])('rtl: %s — ленту не трогаем', (rtl) => {
		expect(
			resolveFocusShift({
				snapport: SNAPPORT,
				focused: span(120, 180),
				item: span(110, 190),
				rtl,
			}),
		).toBeNull()
	})

	/** Лента встаёт на целый пиксель, а края элементов дробные. */
	it('край, вышедший из окна на полпикселя, — ещё в окне', () => {
		const at = (left: number) =>
			resolveFocusShift({
				snapport: SNAPPORT,
				focused: span(left, 180),
				item: span(left, 180),
				rtl: false,
			})

		expect(at(99.6)).toBeNull()
		expect(at(99.4)).not.toBeNull()
	})
})

/**
 * Элемент ленты не шире окна — точка снапа у него одна: начало у начала окна.
 * В RTL начало строки — правый край, и совмещаются правые края.
 */
describe('элемент ленты не шире окна: начало к началу окна', () => {
	const cases = [
		{ name: 'LTR, за краем в конце', item: span(280, 360), rtl: false, shift: 180 },
		{ name: 'LTR, за краем в начале', item: span(40, 120), rtl: false, shift: -60 },
		{ name: 'RTL, за краем в конце', item: span(40, 120), rtl: true, shift: -180 },
		{ name: 'RTL, за краем в начале', item: span(280, 360), rtl: true, shift: 60 },
	]

	it.each(cases)('$name', ({ item, rtl, shift }) => {
		// Под фокусом — узел внутри элемента ленты, с отступом от его краёв
		const focused = span(item.left + 10, item.right - 10)
		const result = resolveFocusShift({ snapport: SNAPPORT, focused, item, rtl })

		expect(result).toBe(shift)

		const after = shifted(item, shift)

		if (rtl) expect(after.right, 'начало элемента — правый край').toBe(SNAPPORT.right)
		else expect(after.left, 'начало элемента — левый край').toBe(SNAPPORT.left)
	})

	/**
	 * Точка снапа — у элемента ленты, а не у элемента под фокусом: снап
	 * действует и на программную прокрутку, и другую точку он бы не удержал.
	 */
	it('ставится элемент ленты, а не вложенный в него', () => {
		expect(
			resolveFocusShift({
				snapport: SNAPPORT,
				focused: span(320, 350),
				item: span(280, 360),
				rtl: false,
			}),
		).toBe(180)
	})
})

/**
 * Элемент под фокусом уже в окне, а его элемент ленты не шире окна — нет. В
 * окне должен стоять весь элемент ленты: снап выравнивает элементы, и
 * докрутку до конца окна он вернул бы к соседней точке, а у тега кольцо
 * рисует пилюля. Сдвиг — к той же точке снапа, что выше: начало элемента
 * ленты у начала окна, в RTL — правые края.
 *
 * Отрезки — как у тега: строка у начала пилюли, крестик у конца. В окне то
 * строка, а за краем крестик, то наоборот.
 */
describe('элемент под фокусом в окне, а элемент ленты не шире окна — нет', () => {
	/** Отрезок лежит в окне снапа. */
	const expectInside = (box: TInlineSpan, what: string) => {
		expect(box.left, `${what}: левый край`).toBeGreaterThanOrEqual(SNAPPORT.left)
		expect(box.right, `${what}: правый край`).toBeLessThanOrEqual(SNAPPORT.right)
	}

	const cases = [
		{
			name: 'LTR, за краем в конце — крестик',
			focused: span(220, 290),
			item: span(220, 320),
			rtl: false,
			shift: 120,
		},
		{
			name: 'LTR, за краем в начале — строка',
			focused: span(150, 174),
			item: span(80, 180),
			rtl: false,
			shift: -20,
		},
		{
			name: 'RTL, за краем в конце — крестик',
			focused: span(110, 180),
			item: span(80, 180),
			rtl: true,
			shift: -120,
		},
		{
			name: 'RTL, за краем в начале — строка',
			focused: span(226, 250),
			item: span(220, 320),
			rtl: true,
			shift: 20,
		},
	]

	it.each(cases)('$name', ({ focused, item, rtl, shift }) => {
		// По одному элементу под фокусом сдвигать нечего: он уже в окне
		expectInside(focused, 'элемент под фокусом до сдвига')

		expect(resolveFocusShift({ snapport: SNAPPORT, focused, item, rtl })).toBe(shift)

		expectInside(shifted(item, shift), 'элемент ленты после сдвига')
	})

	/** Допуск тот же, что у элемента под фокусом: края элементов дробные. */
	it('элемент ленты, вышедший из окна на полпикселя, — ещё в окне', () => {
		const at = (left: number) =>
			resolveFocusShift({
				snapport: SNAPPORT,
				focused: span(120, 180),
				item: span(left, 190),
				rtl: false,
			})

		expect(at(99.6)).toBeNull()
		expect(at(99.4)).not.toBeNull()
	})
})

/**
 * Элемент ленты шире окна: точка снапа у него — любое положение, где он
 * накрывает окно. Из них — ближайшее, при котором элемент под фокусом в окне.
 */
describe('элемент ленты шире окна: ближайшее положение, где он накрывает окно', () => {
	/** Проверка результата: элемент под фокусом в окне, элемент ленты его накрывает. */
	const expectPlaced = (focused: TInlineSpan, item: TInlineSpan, shift: number | null) => {
		if (shift === null) throw new Error('сдвига нет')

		const placedFocus = shifted(focused, shift)
		const placedItem = shifted(item, shift)

		expect(placedFocus.left, 'элемент под фокусом: левый край').toBeGreaterThanOrEqual(
			SNAPPORT.left,
		)
		expect(placedFocus.right, 'элемент под фокусом: правый край').toBeLessThanOrEqual(
			SNAPPORT.right,
		)
		expect(placedItem.left, 'элемент ленты накрывает окно слева').toBeLessThanOrEqual(
			SNAPPORT.left,
		)
		expect(placedItem.right, 'элемент ленты накрывает окно справа').toBeGreaterThanOrEqual(
			SNAPPORT.right,
		)
	}

	/**
	 * Крестик в конце длинного тега за краем окна. С «началом тега к началу
	 * окна» (сдвиг 50) крестик остался бы за краем, на [510, 540].
	 */
	it.each([false, true])('rtl: %s — крестик в конце встаёт у края окна', (rtl) => {
		const focused = span(560, 590)
		const item = span(150, 600)
		const shift = resolveFocusShift({ snapport: SNAPPORT, focused, item, rtl })

		expect(shift).toBe(290)
		expectPlaced(focused, item, shift)
	})

	/** Фокус пришёл с другой стороны: тег начинается далеко за началом окна. */
	it('элемент у начала тега за краем в начале — встаёт у начала окна', () => {
		const focused = span(-390, -370)
		const item = span(-400, 250)
		const shift = resolveFocusShift({ snapport: SNAPPORT, focused, item, rtl: false })

		expect(shift).toBe(-490)
		expectPlaced(focused, item, shift)
	})

	/** Ближе к началу тега ближайшее положение — то же «начало к началу», что у узкого. */
	it('элемент у начала тега за краем в конце — начало тега у начала окна', () => {
		const focused = span(360, 390)
		const item = span(350, 600)
		const shift = resolveFocusShift({ snapport: SNAPPORT, focused, item, rtl: false })

		expect(shift).toBe(250)
		expectPlaced(focused, item, shift)
	})
})

/**
 * Элемент под фокусом шире окна: в окно он не встанет ни при каком сдвиге, и
 * больше всего его видно, когда он окно накрывает.
 */
describe('элемент под фокусом шире окна', () => {
	it('уже накрывает окно — ленту не трогаем', () => {
		expect(
			resolveFocusShift({
				snapport: SNAPPORT,
				focused: span(50, 350),
				item: span(40, 360),
				rtl: false,
			}),
		).toBeNull()
	})

	it('за краем — ближайшее положение, где он накрывает окно', () => {
		expect(
			resolveFocusShift({
				snapport: SNAPPORT,
				focused: span(250, 550),
				item: span(240, 560),
				rtl: false,
			}),
		).toBe(150)
	})
})

/**
 * Проводка: на какой фокус плагин отзывается и чем двигает ленту.
 *
 * Разметка — корень и вьюпорт с элементами, как их рисует Vue. Окно снапа —
 * [20, 180]: вьюпорт [0, 200] без `scroll-padding` по 20 с каждой стороны.
 */
describe('плагин: фокус в ленте', () => {
	const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

	/**
	 * `ResizeObserver` в jsdom не реализован, а плагин заводит его на первом
	 * замере. Заглушка молчит: замер здесь ни при чём.
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
	 * `playground/vue/browser/scroller.spec.ts`.
	 */
	const focusWith = (target: HTMLElement, visible: boolean) => {
		vi.spyOn(target, 'matches').mockImplementation((selector: string) =>
			selector === ':focus-visible'
				? visible
				: Element.prototype.matches.call(target, selector),
		)
		target.focus()
	}

	async function mount(style = 'scroll-padding-left: 20px; scroll-padding-right: 20px') {
		document.body.insertAdjacentHTML(
			'beforeend',
			`<div class="s-scroller">
				<div class="s-scroller__viewport" style="${style}">
					<button class="first">Первый</button>
					<span class="item"><button class="inner">Второй</button></span>
				</div>
			</div>`,
		)

		const root = nodeOf('.s-scroller')
		const viewport = nodeOf('.s-scroller__viewport')
		const scrollBy = vi.fn()

		place(viewport, 0, 200)
		Object.defineProperty(viewport, 'clientWidth', { value: 200 })
		// jsdom прокрутки не знает вовсе — сдвиг ловит шпион
		Object.defineProperty(viewport, 'scrollBy', { value: scrollBy })

		const bundle = new TPluginBundle(new TScroller())
			.use(TElementPlugin)
			.use(TScrollerViewportPlugin)
		const element = bundle.get(TElementPlugin)

		if (!element) throw new Error('узла корня нет')

		element.element = root
		// Корень плагины получают кадром позже
		await nextFrame()

		return { bundle, viewport, scrollBy }
	}

	it('фокус с клавиатуры за краем окна — лента сдвигается сразу и мгновенно', async () => {
		const { scrollBy } = await mount()
		const first = nodeOf('.first')

		place(first, 150, 230)
		focusWith(first, true)

		// Синхронно, в обработчике `focusin`: без ожидания кадра
		expect(scrollBy).toHaveBeenCalledOnce()
		expect(scrollBy).toHaveBeenCalledWith({ left: 130, behavior: 'instant' })
	})

	it('элемент в окне — лента стоит', async () => {
		const { scrollBy } = await mount()
		const first = nodeOf('.first')

		place(first, 40, 120)
		focusWith(first, true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/**
	 * Фокус от нажатия мышью: сдвинься лента между нажатием и отпусканием,
	 * под указателем оказался бы другой элемент, и `click` не дошёл бы.
	 */
	it('фокус не с клавиатуры — лента стоит', async () => {
		const { scrollBy } = await mount()
		const first = nodeOf('.first')

		place(first, 150, 230)
		focusWith(first, false)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/** Вьюпорт — остановка Tab ленты без своих остановок: он и есть окно. */
	it('фокус на самом вьюпорте — лента стоит', async () => {
		const { viewport, scrollBy } = await mount()

		viewport.tabIndex = 0
		focusWith(viewport, true)

		expect(scrollBy).not.toHaveBeenCalled()
	})

	/** Точка снапа — у прямого ребёнка вьюпорта, а не у вложенного узла. */
	it('сдвиг — к началу элемента ленты, в котором лежит элемент под фокусом', async () => {
		const { scrollBy } = await mount()
		const inner = nodeOf('.inner')

		place(nodeOf('.item'), 150, 260)
		place(inner, 200, 250)
		focusWith(inner, true)

		expect(scrollBy).toHaveBeenCalledWith({ left: 130, behavior: 'instant' })
	})

	it('в RTL начало окна справа', async () => {
		const { scrollBy } = await mount(
			'direction: rtl; scroll-padding-left: 20px; scroll-padding-right: 20px',
		)
		const first = nodeOf('.first')

		place(first, -40, 40)
		focusWith(first, true)

		expect(scrollBy).toHaveBeenCalledWith({ left: -140, behavior: 'instant' })
	})

	/** Процент `scroll-padding` — от ширины области прокрутки, `auto` — ноль. */
	it('окно — из вычисленного scroll-padding: процент и auto', async () => {
		const { scrollBy } = await mount('scroll-padding-left: 10%; scroll-padding-right: auto')
		const first = nodeOf('.first')

		place(first, 190, 230)
		focusWith(first, true)

		expect(scrollBy).toHaveBeenCalledWith({ left: 170, behavior: 'instant' })
	})

	it('после уничтожения набора фокус ленту не двигает', async () => {
		const { bundle, scrollBy } = await mount()
		const first = nodeOf('.first')

		bundle.destroy()
		place(first, 150, 230)
		focusWith(first, true)

		expect(scrollBy).not.toHaveBeenCalled()
	})
})
