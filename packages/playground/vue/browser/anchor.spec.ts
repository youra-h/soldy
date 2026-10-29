/**
 * `TAnchorPlugin` в настоящем браузере: раскладка, которую jsdom не считает.
 *
 * `getBoundingClientRect()` в jsdom всегда нули, поэтому измерение панели,
 * flip у края окна, сторона открытой панели, пока окно едет, и пересчёт без
 * scroll/resize (по `ResizeObserver`) проверяются только здесь. Юнит-тесты
 * плагина (`overlay.spec.ts`) те же сценарии гоняют на заглушках координат —
 * здесь эти координаты считает настоящий layout-движок браузера. Так же и
 * слежение по открытости: гаснет панель здесь настоящим переходом темы.
 *
 * Здесь же — граница, внутрь которой плагин сдвигает панель: настоящую полосу
 * прокрутки не подставить заглушкой, а без неё `innerWidth` и видимая область
 * совпадают и сторож пуст. Ради этого с прогона снят `--hide-scrollbars`
 * (`vitest.browser.config.ts`).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import { DatePicker, Frame, Select, SelectItem } from '@soldy-ui/vue'
import type { TSelectPlacement } from '@soldy-ui/core'

import { find } from './colors'
import { settled, whileLeaving } from './transitions'
import { expectClassicScrollbar, expectInsideWindow } from './viewport'

import '@soldy-ui/theme-oren'

const OPTIONS = ['Москва', 'Тверь', 'Тула', 'Казань', 'Самара']

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

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
					class: 'so-test-anchor',
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
							anchor_anchor: this.anchorEl,
							anchor_placement: 'top-start',
							class: 'so-test-panel',
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
					class: 'so-test-anchor',
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
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							anchor_matchWidth: true,
							class: 'so-test-panel',
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
					class: 'so-test-anchor',
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
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							anchor_matchWidth: true,
							class: 'so-test-panel',
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
					class: 'so-test-anchor',
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
							anchor_anchor: this.anchorEl,
							anchor_placement: 'top-start',
							anchor_matchWidth: true,
							class: 'so-test-panel',
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
					{ ref: 'anchor', class: 'so-test-anchor', style: 'width: 200px; height: 32px' },
					'anchor',
				),
				this.anchorEl
					? h(
							Frame,
							{
								visible: true,
								anchor_anchor: this.anchorEl,
								anchor_placement: 'bottom-start',
								class: 'so-test-panel',
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
							class: 'so-test-anchor',
							style: 'width: 200px; height: 32px',
						},
						'anchor',
					),
					this.anchorEl
						? h(
								Frame,
								{
									visible: true,
									anchor_anchor: this.anchorEl,
									anchor_placement: 'top',
									class: 'so-test-panel',
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
 * Якорь и `Frame` сбоку от него — `end-start`: панель у конца строки якоря,
 * верхние края вровень. Где якорь стоит в строке страницы, задаёт `justify`:
 * `center` — место есть с обеих сторон, `flex-end` — у правого края окна.
 * Направление письма — `dir`.
 */
const besideHarness = (justify: 'center' | 'flex-end', dir: 'ltr' | 'rtl' = 'ltr') =>
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
				{ dir, style: `display: flex; justify-content: ${justify}; padding-top: 200px` },
				[
					h(
						'button',
						{
							ref: 'anchor',
							class: 'so-test-anchor',
							style: 'width: 80px; height: 32px',
						},
						'anchor',
					),
					this.anchorEl
						? h(
								Frame,
								{
									visible: true,
									anchor_anchor: this.anchorEl,
									anchor_placement: 'end-start',
									class: 'so-test-panel',
								},
								{
									default: () =>
										h('div', { style: 'width: 100px; height: 60px' }, 'panel'),
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
					{ ref: 'anchor', class: 'so-test-anchor', style: 'width: 80px; height: 32px' },
					'anchor',
				),
			]),
			h('div', { style: 'height: 200vh' }),
			this.anchorEl
				? h(
						Frame,
						{
							visible: true,
							anchor_anchor: this.anchorEl,
							anchor_placement: 'bottom-start',
							class: 'so-test-panel',
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

/**
 * Поле у нижнего края окна посреди длинной страницы: под ним ещё экран, и
 * окну есть куда ехать.
 */
const selectOnLongPage = () => ({
	render: () =>
		h('div', [
			h('div', { style: 'height: calc(100vh - 48px)' }),
			h('div', { style: 'width: 320px' }, [selectWith()]),
			h('div', { style: 'height: 100vh' }),
		]),
})

const panel = () => document.querySelector('.so-test-panel') as HTMLElement
const anchor = () => document.querySelector('.so-test-anchor') as HTMLElement

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.soTheme = 'oren'
})

/**
 * `render()` не убирает за собой сам — без очистки якоря и панели прежних
 * тестов остаются в документе, и `document.querySelector` в следующем тесте
 * находит чужой узел вместо своего.
 */
afterEach(() => {
	cleanup()
	// Окно, которое прокрутил тест, возвращается к началу
	window.scrollTo(0, 0)
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
	/** Отступ панели от поля — `anchor_offset` у Select. */
	const OFFSET = 4
	/** Шаг прокрутки за кадр, px. */
	const STEP = 3

	const arrow = () => document.querySelector('.so-select__arrow') as HTMLElement
	const field = () => document.querySelector('.so-select__field input') as HTMLElement
	const selectPanel = () => document.querySelector('.so-select__panel') as HTMLElement

	/** Место под полем — по корню Select: он и есть якорь панели. */
	const below = () =>
		(window.visualViewport?.height ?? window.innerHeight) -
		find('.so-select').getBoundingClientRect().bottom

	/** Место, которое нужно открытой панели с её стороны поля. */
	const needed = () => selectPanel().getBoundingClientRect().height + OFFSET

	/**
	 * Сдвиг окна, с которого под полем влезает открытая панель, — с запасом в
	 * восемь шагов прокрутки. Меряется при окне в начале.
	 */
	const farWhereBelowFits = () => Math.ceil(needed() - below()) + 8 * STEP

	/**
	 * Стрелка — кликом в странице, а не `userEvent`. После закрытия стрелка
	 * ещё поворачивается переходом темы, и Playwright сочтёт её нестабильной:
	 * повторяя клик, он прокручивает цель к низу окна
	 * (`scrollIntoView({ block: 'end' })`) — туда, где снизу панель не влезает,
	 * и сторону показ выбрал бы уже там. Эти случаи проверяют сторону, а не
	 * ввод.
	 */
	const toggleInPage = async () => {
		arrow().click()
		await nextTick()
	}

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
		await expect
			.poll(() => selectPanel().getBoundingClientRect().bottom)
			.toBeLessThanOrEqual(field().getBoundingClientRect().top + 1)
	})

	/**
	 * Окно едет, как его ведёт палец на телефоне: по нескольку пикселей за
	 * кадр, через прежнюю границу «снизу влезает» и обратно. Правило без памяти
	 * на этой границе уводило открытую панель вниз и возвращало наверх — она
	 * скакала. Открытая панель держит сторону, пока на ней влезает, а заново
	 * сторону выбирает следующее открытие.
	 */
	it('открытая панель держит сторону, пока окно едет через границу «снизу влезает»', async () => {
		render(selectOnLongPage())

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')

		// С этого сдвига окна снизу панель влезает, и прежнее правило увело бы
		// её вниз. Окно проезжает его с запасом
		const far = farWhereBelowFits()

		const placements: Array<string | null> = []
		const record = () => placements.push(selectPanel().getAttribute('data-placement'))
		const observer = new MutationObserver(record)

		observer.observe(selectPanel(), { attributeFilter: ['data-placement'] })

		const scrollWindow = async (y: number) => {
			window.scrollTo(0, y)
			await nextFrame()

			expect(
				selectPanel().getBoundingClientRect().bottom,
				`панель над полем, окно на ${y}px`,
			).toBeLessThanOrEqual(field().getBoundingClientRect().top + 1)
		}

		for (let y = STEP; y <= far; y += STEP) await scrollWindow(y)

		expect(below(), 'снизу панель влезает').toBeGreaterThanOrEqual(needed())

		for (let y = far - STEP; y >= 0; y -= STEP) await scrollWindow(y)

		if (observer.takeRecords().length > 0) record()
		observer.disconnect()

		expect(placements, 'смены стороны').toEqual([])

		// Закрыли и, когда панель исчезла, открыли там, где снизу влезает, —
		// сторону выбирает показ
		await scrollWindow(far)
		await toggleInPage()
		await expect.poll(() => getComputedStyle(selectPanel()).display).toBe('none')

		expect(window.scrollY, 'окно там, где снизу влезает').toBe(far)

		await toggleInPage()

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect
			.poll(() => selectPanel().getBoundingClientRect().top)
			.toBeGreaterThanOrEqual(field().getBoundingClientRect().bottom - 1)
		expect(window.scrollY, 'окно стоит').toBe(far)
	})

	/**
	 * Сторону показ выбирает заново и тогда, когда закрытая панель ещё гаснет:
	 * гаснущая держит сторону, как открытая, но забывает её показ, а не конец
	 * угасания. Переходы закрытия стоят на паузе — показ застаёт панель
	 * гаснущей, как бы ни медлил прогон.
	 */
	it('показ во время угасания выбирает сторону заново', async () => {
		render(selectOnLongPage())

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('top-start')
		await settled(selectPanel())

		const far = farWhereBelowFits()

		window.scrollTo(0, far)
		await nextFrame()

		// Открытая панель держит сторону и там, где снизу влезает
		expect(selectPanel().getAttribute('data-placement')).toBe('top-start')

		await toggleInPage()

		const fading = selectPanel().getAnimations()

		for (const animation of fading) animation.pause()

		await nextFrame()

		expect(fading.length, 'переходы закрытия').toBeGreaterThan(0)
		expect(selectPanel().dataset.open, 'закрыта').toBe('false')
		expect(getComputedStyle(selectPanel()).display, 'ещё на экране').not.toBe('none')

		await toggleInPage()

		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect
			.poll(() => selectPanel().getBoundingClientRect().top)
			.toBeGreaterThanOrEqual(field().getBoundingClientRect().bottom - 1)
		expect(window.scrollY, 'окно стоит').toBe(far)
	})
})

/**
 * Сама причина дрожи на телефоне: страницу там прокручивает композитор, а
 * `scroll` приходит в JS кадром позже. Панель `fixed` до него стоит, а поле
 * уже уехало. Панель у якоря на странице — `absolute`, в документе, и
 * прокрутку окна браузер применяет к ней вместе с полем.
 *
 * Измеряем сразу за `scrollTo`, в той же задаче: раскладка уже прокручена, а
 * `scroll` браузер шлёт только на следующем кадре, и пересчитать плагин ещё
 * ничего не мог.
 */
describe('прокрутка окна', () => {
	const arrow = () => document.querySelector('.so-select__arrow') as HTMLElement
	const selectPanel = () => document.querySelector('.so-select__panel') as HTMLElement
	const gap = () =>
		selectPanel().getBoundingClientRect().top -
		find('.so-select').getBoundingClientRect().bottom

	it('панель едет с полем ещё до события scroll', async () => {
		render({
			render: () =>
				h('div', [
					h('div', { style: 'height: 100px' }),
					h('div', { style: 'width: 320px' }, [selectWith()]),
					h('div', { style: 'height: 200vh' }),
				]),
		})

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect.poll(gap).toBeGreaterThanOrEqual(0)

		const before = gap()
		const scrolled = vi.fn()

		window.addEventListener('scroll', scrolled, { once: true })
		window.scrollTo(0, 60)

		expect(window.scrollY, 'окно прокрутилось').toBe(60)
		expect(scrolled, 'scroll ещё не пришёл').not.toHaveBeenCalled()
		expect(gap()).toBeCloseTo(before, 0)

		window.removeEventListener('scroll', scrolled)
	})

	/**
	 * Поле в шапке `fixed` прокрутка окна не двигает — и панель у него
	 * `fixed`: в документе она уезжала бы от поля до пересчёта.
	 */
	it('у поля в fixed-шапке панель стоит с ним ещё до события scroll', async () => {
		render({
			render: () =>
				h('div', [
					h('div', { style: 'position: fixed; top: 0; left: 0; width: 320px' }, [
						selectWith(),
					]),
					h('div', { style: 'height: 200vh' }),
				]),
		})

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await expect.poll(gap).toBeGreaterThanOrEqual(0)

		const before = gap()

		window.scrollTo(0, 60)

		expect(window.scrollY, 'окно прокрутилось').toBe(60)
		expect(gap()).toBeCloseTo(before, 0)
	})

	/**
	 * Панель в документе фокус может прокрутить к себе. DatePicker уводит фокус
	 * на день кадром позже показа — раньше, чем панель измерена: она ещё стоит
	 * под полем, по нулевой высоте. Прокрутка к ней увела бы страницу, и
	 * панель осталась бы внизу. Фокус в панель окно не прокручивает.
	 */
	it('DatePicker у нижнего края открывается над полем, окно стоит', async () => {
		render({
			render: () =>
				h('div', [
					h('div', { style: 'height: calc(100vh - 48px)' }),
					h('div', { style: 'width: 320px' }, [
						h(DatePicker, { value: '2026-05-12', aria_label: 'Дата' }),
					]),
					h('div', { style: 'height: 100vh' }),
				]),
		})

		await userEvent.click(find('.so-date-picker__trigger'))
		await expect
			.poll(() => document.activeElement?.classList.contains('so-calendar-item'))
			.toBe(true)
		await expect
			.poll(() => find('.so-date-picker__panel').getAttribute('data-placement'))
			.toBe('top-start')

		expect(window.scrollY).toBe(0)
	})
})

/**
 * Место панели плагин считает, только пока она на экране: показана или ещё
 * гаснет. Поле здесь во внутренней прокрутке, а панель в `body`, и за полем
 * её двигает только пересчёт по `scroll` блока. Гаснущая панель идёт за полем
 * до конца, а закрытая на прокрутку не отвечает: место её стоит.
 */
describe('слежение по открытости', () => {
	const arrow = () => find('.so-select__arrow')
	const selectPanel = () => find('.so-select__panel')
	/** Зазор между полем и панелью под ним: у панели, которая идёт за полем, он прежний. */
	const gap = () =>
		selectPanel().getBoundingClientRect().top -
		find('.so-select').getBoundingClientRect().bottom

	it('гаснущая панель идёт за полем до конца, закрытая место не считает', async () => {
		render({
			render: () =>
				h('div', { class: 'so-test-scroller', style: 'height: 400px; overflow-y: auto' }, [
					h('div', { style: 'height: 60px' }),
					h('div', { style: 'width: 320px' }, [selectWith()]),
					h('div', { style: 'height: 1000px' }),
				]),
		})

		const scroller = find('.so-test-scroller')

		await userEvent.click(arrow())
		await expect.poll(() => selectPanel().getAttribute('data-placement')).toBe('bottom-start')
		await settled(selectPanel())

		const open = gap()
		let scrolled = 0

		// At each moment of the leaving the block scrolls by a step. `scroll`
		// comes a frame later, and the moment waits until the panel is at the
		// field again: the leaving is paused, and the panel stays on screen
		await whileLeaving(
			selectPanel(),
			() => userEvent.click(arrow()),
			async () => {
				scrolled += 4
				scroller.scrollTop = scrolled

				await expect
					.poll(() => Math.abs(gap() - open), { message: `зазор, блок на ${scrolled}px` })
					.toBeLessThan(1)
			},
		)

		expect(scroller.scrollTop, 'блок прокрутился').toBe(scrolled)

		// Конец закрытия плагин узнаёт микрозадачей за концом перехода
		await nextFrame()

		const top = selectPanel().style.top

		scroller.scrollTop = scrolled + 100
		await nextFrame()
		await nextFrame()

		expect(scroller.scrollTop, 'блок прокрутился').toBe(scrolled + 100)
		expect(selectPanel().style.top, 'закрытая панель место не считает').toBe(top)
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

/**
 * Стороны строки: `end-start` ставит панель у конца строки якоря, верхние края
 * вровень. Конец — логический: в LTR справа, в RTL слева. У правого края окна
 * flip переносит панель к началу строки, а `data-placement` называет
 * логическую сторону, на которой она встала.
 *
 * Координаты плагин узнаёт по `ready` и `ResizeObserver`, поэтому край панели
 * опрашиваем: на кадре до замера панель стоит по нулевой ширине.
 */
describe('боковые стороны', () => {
	it('end-start в LTR — справа от якоря, верхние края вровень', async () => {
		render(besideHarness('center'))

		const anchorRect = anchor().getBoundingClientRect()

		await expect
			.poll(() => panel().getBoundingClientRect().left)
			.toBeCloseTo(anchorRect.right, 0)
		expect(panel().getBoundingClientRect().top).toBeCloseTo(anchorRect.top, 0)
		expect(panel().dataset.placement).toBe('end-start')
	})

	it('у правого края окна end-start встаёт слева от якоря — start-start', async () => {
		render(besideHarness('flex-end'))

		const anchorRect = anchor().getBoundingClientRect()

		// Справа места под панель действительно нет
		expect(document.documentElement.clientWidth - anchorRect.right).toBeLessThan(100)

		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(anchorRect.left, 0)
		expect(panel().getBoundingClientRect().top).toBeCloseTo(anchorRect.top, 0)
		expect(panel().dataset.placement).toBe('start-start')
		expectInsideWindow(panel(), 'панель')
	})

	it('dir=rtl: end — слева от якоря, data-placement логический', async () => {
		render(besideHarness('center', 'rtl'))

		const anchorRect = anchor().getBoundingClientRect()

		await expect
			.poll(() => panel().getBoundingClientRect().right)
			.toBeCloseTo(anchorRect.left, 0)
		expect(panel().getBoundingClientRect().top).toBeCloseTo(anchorRect.top, 0)
		expect(panel().dataset.placement).toBe('end-start')
	})
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
