/**
 * `TAnchorPlugin` в настоящем браузере: раскладка, которую jsdom не считает.
 *
 * `getBoundingClientRect()` в jsdom всегда нули, поэтому измерение панели,
 * flip у края окна и пересчёт без scroll/resize (по `ResizeObserver`)
 * проверяются только здесь. Юнит-тесты плагина (`overlay.spec.ts`) те же
 * сценарии гоняют на заглушках координат — здесь эти координаты считает
 * настоящий layout-движок браузера.
 *
 * Здесь же — граница, внутрь которой плагин сдвигает панель: настоящую полосу
 * прокрутки не подставить заглушкой, а без неё `innerWidth` и видимая область
 * совпадают и сторож пуст. Ради этого с прогона снят `--hide-scrollbars`
 * (`vitest.browser.config.ts`).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Frame, Select, SelectItem } from '@soldy-ui/vue'
import type { TSelectPlacement } from '@soldy-ui/core'

import { expectClassicScrollbar, expectInsideWindow } from './viewport'

import '@soldy-ui/theme-oren'

const OPTIONS = ['Москва', 'Тверь', 'Тула', 'Казань', 'Самара']

/**
 * Якорь-кнопка и `Frame` над ней. Ссылку на якорь плагин получает как
 * `Element` напрямую, а не через `rootElement` компонента — как это делают
 * Select и Popover.
 */
const TopStartHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, open: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 300px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 's-test-anchor',
					style: 'width: 80px; height: 32px',
					onClick: () => {
						this.open = true
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: this.open,
							position: 'fixed',
							anchor_anchor: this.anchorEl,
							anchor_placement: 'top-start',
							class: 's-test-panel',
						},
						{
							default: () =>
								h('div', { style: 'width: 120px; height: 60px' }, 'panel'),
						},
					)
				: null,
		])
	},
})

/** Тот же якорь, но ширина переключается кликом — без единого scroll/resize окна. */
const ResizableAnchorHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, wide: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 250px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 's-test-anchor',
					style: `width: ${this.wide ? 260 : 120}px; height: 32px`,
					onClick: () => {
						this.wide = !this.wide
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							position: 'fixed',
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							anchor_matchWidth: true,
							class: 's-test-panel',
						},
						{ default: () => h('div', { style: 'height: 40px' }, 'panel') },
					)
				: null,
		])
	},
})

/**
 * Якорь, у которого кликом меняются только рамка и паддинг: содержимое то же,
 * content-box прежний, border-box вырос.
 *
 * `box-sizing: content-box` здесь обязателен и задан явно: на стенде и в теме
 * глобально `border-box`, и при нём фиксированные `width`/`height` удержали бы
 * внешний размер якоря — меняться было бы нечему.
 */
const PaddedAnchorHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, thick: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 200px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 's-test-anchor',
					style: [
						'box-sizing: content-box; width: 120px; height: 32px',
						`padding: ${this.thick ? 20 : 0}px`,
						`border: ${this.thick ? 6 : 0}px solid`,
					].join('; '),
					onClick: () => {
						this.thick = true
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							position: 'fixed',
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							anchor_matchWidth: true,
							class: 's-test-panel',
						},
						{ default: () => h('div', { style: 'height: 40px' }, 'panel') },
					)
				: null,
		])
	},
})

/**
 * Панель над якорем с `matchWidth` и текстом, который переносится: якорь
 * сужается кликом, и от новой ширины панель становится выше.
 */
const WrappingPanelHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null, narrow: false }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', { style: 'position: relative; padding-top: 300px' }, [
			h(
				'button',
				{
					ref: 'anchor',
					class: 's-test-anchor',
					style: `width: ${this.narrow ? 120 : 360}px; height: 32px`,
					onClick: () => {
						this.narrow = true
					},
				},
				'anchor',
			),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							position: 'fixed',
							anchor_anchor: this.anchorEl,
							anchor_placement: 'top-start',
							anchor_matchWidth: true,
							class: 's-test-panel',
						},
						{ default: () => h('div', 'один два три четыре пять шесть семь') },
					)
				: null,
		])
	},
})

/** Якорь внутри `dir="rtl"`: `-start` обязан выравниваться по правому краю. */
const RtlHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h(
			'div',
			{ dir: 'rtl', style: 'position: relative; padding-top: 250px; width: 400px' },
			[
				h(
					'button',
					{ ref: 'anchor', class: 's-test-anchor', style: 'width: 200px; height: 32px' },
					'anchor',
				),
				this.anchorEl
					? h(
							Frame,
							{
								visible: true,
								position: 'fixed',
								anchor_anchor: this.anchorEl,
								anchor_placement: 'bottom-start',
								class: 's-test-panel',
							},
							{
								default: () =>
									h('div', { style: 'width: 120px; height: 40px' }, 'panel'),
							},
						)
					: null,
			],
		)
	},
})

/**
 * Якорь шире панели, панель над ним по центру (`top`). Направление письма —
 * параметром: центр от него не зависит, и в RTL панель стоит там же.
 */
const centerHarness = (dir: 'ltr' | 'rtl') =>
	defineComponent({
		data() {
			return { anchorEl: null as Element | null }
		},
		mounted() {
			this.anchorEl = this.$refs.anchor as Element
		},
		render() {
			return h(
				'div',
				{ dir, style: 'position: relative; padding-top: 250px; width: 400px' },
				[
					h(
						'button',
						{
							ref: 'anchor',
							class: 's-test-anchor',
							style: 'width: 200px; height: 32px',
						},
						'anchor',
					),
					this.anchorEl
						? h(
								Frame,
								{
									visible: true,
									position: 'fixed',
									anchor_anchor: this.anchorEl,
									anchor_placement: 'top',
									class: 's-test-panel',
								},
								{
									default: () =>
										h('div', { style: 'width: 120px; height: 40px' }, 'panel'),
								},
							)
						: null,
				],
			)
		},
	})

/**
 * Якорь у самого правого края страницы, которая выше окна, и панель заметно
 * шире места справа от него.
 *
 * Филлер `200vh` здесь не для прокрутки, а ради полосы: она и есть предмет
 * теста. `innerWidth` считает полосу своей, `documentElement.clientWidth` —
 * нет, и от того, какую границу взял shift, зависит, видно панель целиком или
 * её край спрятан под полосой.
 */
const RightEdgeHarness = defineComponent({
	data() {
		return { anchorEl: null as Element | null }
	},
	mounted() {
		this.anchorEl = this.$refs.anchor as Element
	},
	render() {
		return h('div', [
			h('div', { style: 'display: flex; justify-content: flex-end; padding-top: 100px' }, [
				h(
					'button',
					{ ref: 'anchor', class: 's-test-anchor', style: 'width: 80px; height: 32px' },
					'anchor',
				),
			]),
			h('div', { style: 'height: 200vh' }),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							position: 'fixed',
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							class: 's-test-panel',
						},
						{
							default: () =>
								h('div', { style: 'width: 300px; height: 60px' }, 'panel'),
						},
					)
				: null,
		])
	},
})

/** Select с опциями. Без `placement` проп не пишется вовсе — работает умолчание. */
const selectWith = (placement?: TSelectPlacement) =>
	h(
		Select,
		{ name: 'Город', ...(placement ? { placement } : {}) },
		{
			default: () =>
				OPTIONS.map((text, index) =>
					h(SelectItem, { key: text, value: String(index), text }),
				),
		},
	)

/** Поле почти у нижнего края окна — панели внизу не хватит места. */
const selectAtBottom = (placement?: TSelectPlacement) => ({
	render: () =>
		h('div', [
			h('div', { style: 'height: calc(100vh - 48px)' }),
			h('div', { style: 'width: 320px' }, [selectWith(placement)]),
		]),
})

/** Поле у верхнего края страницы — панели сверху места нет. */
const selectAtTop = (placement?: TSelectPlacement) => ({
	render: () => h('div', { style: 'width: 320px' }, [selectWith(placement)]),
})

const panel = () => document.querySelector('.s-test-panel') as HTMLElement
const anchor = () => document.querySelector('.s-test-anchor') as HTMLElement

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.theme = 'oren'
})

/**
 * `render()` не убирает за собой сам — без очистки якоря и панели прежних
 * тестов остаются в документе, и `document.querySelector` в следующем тесте
 * находит чужой узел вместо своего.
 */
afterEach(() => {
	cleanup()
})

describe('измерение панели', () => {
	/**
	 * Пока панель скрыта через `v-show`, её размер — ноль, и первый расчёт
	 * координат (по событию `show`) использует ещё нулевую высоту. Правильную
	 * высоту получает `ResizeObserver` кадром позже, когда панель уже видна —
	 * без него `top-start` на первом открытии стоял бы неверно.
	 */
	it('top-start верно стоит на первом же открытии', async () => {
		render(TopStartHarness)

		await userEvent.click(anchor())

		const anchorRect = anchor().getBoundingClientRect()

		await expect.poll(() => panel().getBoundingClientRect().height).toBe(60)
		await expect
			.poll(() => panel().getBoundingClientRect().top)
			.toBeCloseTo(anchorRect.top - 60, 0)
		expect(panel().dataset.placement).toBe('top-start')
	})
})

describe('flip', () => {
	const arrow = () => document.querySelector('.s-select__arrow') as HTMLElement
	const field = () => document.querySelector('.s-select__field input') as HTMLElement
	const selectPanel = () => document.querySelector('.s-select__panel') as HTMLElement

	it('Select у низа окна открывается вверх', async () => {
		render(selectAtBottom())

		await userEvent.click(arrow())

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')

		expect(selectPanel().getBoundingClientRect().bottom).toBeLessThanOrEqual(
			field().getBoundingClientRect().top + 1,
		)
	})

	/** `bottom` запрещает flip: панель остаётся снизу, хоть там и не влезает. */
	it('placement: bottom у низа окна остаётся снизу', async () => {
		render(selectAtBottom('bottom'))

		await userEvent.click(arrow())

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')

		expect(selectPanel().getBoundingClientRect().top).toBeGreaterThanOrEqual(
			field().getBoundingClientRect().bottom - 1,
		)
	})

	/** `top` у верха страницы: места сверху нет, но сторона потребителя держится. */
	it('placement: top у верха страницы остаётся сверху', async () => {
		render(selectAtTop('top'))

		await userEvent.click(arrow())

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')

		expect(selectPanel().getBoundingClientRect().bottom).toBeLessThanOrEqual(
			field().getBoundingClientRect().top + 1,
		)
	})
})

describe('пересчёт без scroll/resize окна', () => {
	it('якорь меняет ширину — matchWidth панели едет следом', async () => {
		render(ResizableAnchorHarness)

		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(120, 0)

		await userEvent.click(anchor())

		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(260, 0)
	})

	/**
	 * Наблюдатели смотрят border-box — ровно то, что плагин меряет
	 * `getBoundingClientRect()`. У якоря меняются только рамка и паддинг:
	 * content-box прежний, и с умолчанием `content-box` уведомления бы не было
	 * вовсе, а `y` и ширина панели держались бы устаревшими до ближайшего
	 * scroll/resize окна.
	 */
	it('у якоря сменились только рамка и паддинг — bottom-start и matchWidth едут следом', async () => {
		render(PaddedAnchorHarness)

		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(120, 0)

		const before = anchor().getBoundingClientRect()

		await userEvent.click(anchor())

		// Сначала убеждаемся, что поменялся именно border-box якоря: иначе
		// проверка ниже прошла бы и на неподвижной панели.
		await expect
			.poll(() => anchor().getBoundingClientRect().width)
			.toBeGreaterThan(before.width)
		expect(anchor().getBoundingClientRect().height).toBeGreaterThan(before.height)

		await expect
			.poll(() => panel().getBoundingClientRect().width)
			.toBeCloseTo(anchor().getBoundingClientRect().width, 0)
		await expect
			.poll(() => panel().getBoundingClientRect().top)
			.toBeCloseTo(anchor().getBoundingClientRect().bottom, 0)
	})

	/**
	 * На уведомление якоря плагин снимает наблюдение панели до следующего
	 * кадра, иначе её уведомление пропускалось бы в том же шаге. От новой
	 * ширины текст перенёсся, и панель выросла, пока за ней никто не следил:
	 * поправить `y` плагин может только по вернувшемуся наблюдению.
	 */
	it('якорь сузился, текст панели перенёсся — top-start поправляет y по вернувшемуся наблюдению', async () => {
		render(WrappingPanelHarness)

		await expect
			.poll(() => panel().getBoundingClientRect().bottom)
			.toBeCloseTo(anchor().getBoundingClientRect().top, 0)

		const height = panel().getBoundingClientRect().height

		await userEvent.click(anchor())

		await expect.poll(() => panel().getBoundingClientRect().height).toBeGreaterThan(height)
		await expect
			.poll(() => panel().getBoundingClientRect().bottom)
			.toBeCloseTo(anchor().getBoundingClientRect().top, 0)
	})
})

describe('RTL', () => {
	it('dir=rtl выравнивает -start по правому краю якоря', async () => {
		render(RtlHarness)

		const anchorRect = anchor().getBoundingClientRect()

		// Ширина панели известна браузеру сразу (у неё нет скрытой фазы), а
		// координата приходит асинхронно — через `ready`/`ResizeObserver`.
		// Опрашиваем именно её, а не размер, иначе можно поймать кадр до того,
		// как плагин пересчитал `x` под RTL.
		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(anchorRect.right, 0)
	})
})

describe('центр', () => {
	/** Середина прямоугольника по горизонтали. */
	const middle = (rect: DOMRect) => rect.left + rect.width / 2

	/**
	 * Ширину панели плагин узнаёт по `ready` и `ResizeObserver`, поэтому
	 * середину опрашиваем: на кадре до замера панель стоит серединой якоря
	 * своим левым краем.
	 */
	it.each(['ltr', 'rtl'] as const)(
		'%s: top ставит середину панели над серединой якоря',
		async (dir) => {
			render(centerHarness(dir))

			const anchorRect = anchor().getBoundingClientRect()

			await expect
				.poll(() => middle(panel().getBoundingClientRect()))
				.toBeCloseTo(middle(anchorRect), 0)
			await expect
				.poll(() => panel().getBoundingClientRect().bottom)
				.toBeCloseTo(anchorRect.top, 0)
			expect(panel().dataset.placement).toBe('top')
		},
	)
})

describe('граница — видимая область', () => {
	/**
	 * Ширина полосы на время теста своя, известная.
	 *
	 * Платформенная разная — локально Windows, в CI Ubuntu, — а где-то полоса и
	 * вовсе накладная и места не занимает. Сторожить этот спек должен не её:
	 * ему нужно, чтобы `innerWidth` и `clientWidth` расходились заведомо
	 * заметнее субпиксельного допуска.
	 */
	const SCROLLBAR = 20

	let style: HTMLStyleElement | null = null

	beforeEach(() => {
		style = document.createElement('style')
		style.textContent = `html::-webkit-scrollbar { width: ${SCROLLBAR}px }`
		document.head.append(style)
	})

	afterEach(() => {
		style?.remove()
		style = null
	})

	/**
	 * Сторож правки 869f4puaa: границей shift служит `window.visualViewport`, а
	 * не `window.innerWidth`. Разница между ними и есть ширина классической
	 * полосы прокрутки, поэтому без полосы в прогоне (Playwright запускает
	 * Chromium с `--hide-scrollbars`, флаг снят в `vitest.browser.config.ts`)
	 * тест зелёный при любой реализации.
	 */
	it('панель у правого края прижата к видимой области, а не к innerWidth', async () => {
		render(RightEdgeHarness)

		expectClassicScrollbar()

		const root = document.documentElement
		const anchorRect = anchor().getBoundingClientRect()

		// Сдвиг действительно нужен: без него панель, выровненная по левому
		// краю якоря, ушла бы за край видимой области.
		await expect.poll(() => panel().getBoundingClientRect().width).toBeCloseTo(300, 0)
		expect(anchorRect.left + 300, 'без сдвига панель не помещается').toBeGreaterThan(
			root.clientWidth,
		)

		// Правый край панели совпал с краем видимой области. Сравнение
		// двустороннее: «зазор меньше пикселя» выполняется и у панели, которая
		// уехала за край, — то есть ровно в том случае, который сторожим.
		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(root.clientWidth, 0)

		expectInsideWindow(panel(), 'панель')
	})
})
