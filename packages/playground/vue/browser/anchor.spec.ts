/**
 * `TAnchorPlugin` в настоящем браузере: раскладка, которую jsdom не считает.
 *
 * `getBoundingClientRect()` в jsdom всегда нули, поэтому измерение панели,
 * flip у края окна и пересчёт без scroll/resize (по `ResizeObserver`)
 * проверяются только здесь. Юнит-тесты плагина (`overlay.spec.ts`) те же
 * сценарии гоняют на заглушках координат — здесь эти координаты считает
 * настоящий layout-движок браузера.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Frame, Select, SelectItem } from '@soldy/ui-vue'
import type { TSelectPlacement } from '@soldy/core'

import '@soldy/theme-oren'

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
						{ default: () => h('div', { style: 'width: 120px; height: 60px' }, 'panel') },
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
							{ default: () => h('div', { style: 'width: 120px; height: 40px' }, 'panel') },
						)
					: null,
			],
		)
	},
})

/** Select с опциями. Без `placement` проп не пишется вовсе — работает умолчание. */
const selectWith = (placement?: TSelectPlacement) =>
	h(
		Select,
		{ name: 'Город', ...(placement ? { placement } : {}) },
		{
			default: () =>
				OPTIONS.map((text, index) => h(SelectItem, { key: text, value: String(index), text })),
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
