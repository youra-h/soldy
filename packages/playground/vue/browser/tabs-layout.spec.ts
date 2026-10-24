/**
 * `TTabsLayoutPlugin` в настоящем браузере: отметка активного таба
 * пересчитывается, когда у таба меняется только паддинг и когда табы сдвигает
 * слот ряда, — и стоит под активным табом при слотах и выравнивании.
 *
 * Подчёркивание (`view: line`) — переменные `--so-tabs-active-pos`/`--so-tabs-active-size`
 * на ряду, посчитанные `TTabsActiveTabPlugin` по `offsetLeft`/`offsetWidth`
 * активного таба, то есть по border-box и от ряда: он ближайший
 * позиционированный предок таба. Пересчёт запускает `change:layout` от
 * наблюдателей `TTabsLayoutPlugin`. Какой бокс они смотрят и за чем следят,
 * видно только здесь: в jsdom раскладки нет, а заглушка наблюдателя в
 * `setup/__tests__/helpers.ts` опцию `box` не различает.
 *
 * Проверен поломкой: без наблюдателя списка падает «trailing вырос» — табы
 * уехали, а полоса осталась на старом месте.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Tabs, TabsItem } from '@soldy-ui/vue'

import { pseudoBox } from './pseudo-box'

import '@soldy-ui/theme-oren'

const TABS = ['Первый', 'Второй', 'Третий']

/** Горизонтальный паддинг активного таба после клика — с каждой стороны. */
const PADDING = 24

/**
 * Допуск на округление, px. Место и длину таба `TTabsActiveTabPlugin` берёт в
 * целых `offset*`, а коробка обёртки дробная: край отметки отходит от неё
 * меньше чем на пиксель.
 */
const EPSILON = 1

/**
 * Табы, у активного из которых кликом растёт только горизонтальный паддинг:
 * текст тот же, content-box таба и высота строки прежние, border-box шире.
 *
 * Ширина табу не задаётся: в теме глобально `border-box`, и при нём
 * фиксированная `width` удержала бы внешний размер — паддинг ушёл бы из
 * content-box. Кликают по кнопке рядом, а не по табу: клик по табу — это
 * активация, и пересчёт пришёл бы от неё.
 */
const PaddedTabHarness = defineComponent({
	data() {
		return { padded: false }
	},
	render() {
		return h('div', [
			h(
				'button',
				{
					class: 'so-test-toggle',
					onClick: () => {
						this.padded = true
					},
				},
				'padding',
			),
			h(
				Tabs,
				{ view: 'line' },
				{
					default: () =>
						TABS.map((text, index) =>
							h(TabsItem, {
								key: text,
								value: String(index),
								text,
								active: index === 0,
								style:
									index === 0
										? `padding-inline: ${this.padded ? PADDING : 0}px`
										: undefined,
							}),
						),
				},
			),
		])
	},
})

/** Метка в слоте ряда: блок заданной ширины. */
const mark = (width: number) =>
	h('span', { class: 'so-test-mark', style: `display: block; width: ${width}px; height: 16px` })

/** Табы набора, средний — активный: у него соседи с обеих сторон. */
const tabItems = () =>
	TABS.map((text, index) =>
		h(TabsItem, { key: text, value: String(index), text, active: index === 1 }),
	)

/**
 * Табы по центру со слотом `trailing`, который кликом по кнопке рядом растёт:
 * список между слотами сужается, и табы съезжают, а их размеры и размер корня
 * прежние.
 */
const GrowingTrailingHarness = defineComponent({
	data() {
		return { wide: false }
	},
	render() {
		return h('div', { style: 'width: 640px' }, [
			h(
				'button',
				{
					class: 'so-test-toggle',
					onClick: () => {
						this.wide = true
					},
				},
				'trailing',
			),
			h(
				Tabs,
				{ view: 'line', alignment: 'center' },
				{ default: tabItems, trailing: () => mark(this.wide ? 200 : 16) },
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

const root = () => find('.so-tabs')
/** Ряд набора — список и слоты по его краям: переменные и отметку несёт он. */
const bar = () => find('.so-tabs__bar')
const activeTab = () => find('.so-tabs-item[data-selected="true"]')
const toggle = () => find('.so-test-toggle')

const underlineSize = () => parseFloat(bar().style.getPropertyValue('--so-tabs-active-size'))

/** Ширина content-box: `clientWidth` — паддинг-бокс, рамки в него не входят. */
const contentWidth = (element: HTMLElement) => {
	const style = getComputedStyle(element)

	return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
}

/** Плагин раскладки записал геометрию: модификатор он ставит после первой записи. */
const measured = async () => {
	await expect.poll(() => root().classList.contains('so-tabs--ready-animation')).toBe(true)
}

/** Края отметки по строке, которые расходятся с краями активного таба. */
const misses = (box: DOMRect): string[] => {
	const tab = activeTab().getBoundingClientRect()

	return (['left', 'right'] as const)
		.filter((edge) => Math.abs(box[edge] - tab[edge]) > EPSILON)
		.map((edge) => `${edge}: отметка ${box[edge]}, таб ${tab[edge]}`)
}

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('пересчёт без смены содержимого', () => {
	/**
	 * Наблюдатели смотрят border-box — ровно то, что меряет `TTabsActiveTabPlugin`.
	 * У таба вырос только паддинг, строка той же высоты, и корень размера не
	 * меняет: с умолчанием `content-box` уведомления не было бы ни от таба, ни
	 * от корня, и подчёркивание держалось бы по старой ширине.
	 */
	it('у активного таба вырос только горизонтальный паддинг — --so-tabs-active-size пересчитан', async () => {
		render(PaddedTabHarness)

		await expect.poll(() => underlineSize()).toBe(activeTab().offsetWidth)

		const tabWidth = activeTab().offsetWidth
		const tabContent = contentWidth(activeTab())
		const rootSize = [root().offsetWidth, root().offsetHeight]

		await userEvent.click(toggle())

		// Сначала убеждаемся, что вырос именно border-box таба, а content-box таба
		// и размер корня прежние: иначе проверка ниже прошла бы на неподвижном
		// подчёркивании или сторожила бы не border-box.
		await expect.poll(() => activeTab().offsetWidth).toBe(tabWidth + 2 * PADDING)
		expect(contentWidth(activeTab())).toBe(tabContent)
		expect([root().offsetWidth, root().offsetHeight]).toEqual(rootSize)

		await expect.poll(() => underlineSize()).toBe(tabWidth + 2 * PADDING)
	})

	/**
	 * Табы по центру, слот `trailing` вырос: список между слотами сузился, и табы
	 * съехали, а размеры табов и корня прежние. Пересчёт приходит от
	 * наблюдателя своего списка — без него полоса осталась бы на старом месте.
	 */
	it('trailing вырос при center — полоса переехала вслед за табом', async () => {
		render(GrowingTrailingHarness)

		await measured()
		await expect.poll(() => misses(pseudoBox(bar(), '::after'))).toEqual([])

		const before = activeTab().getBoundingClientRect()
		const rootSize = [root().offsetWidth, root().offsetHeight]

		await userEvent.click(toggle())

		// Таб съехал, а его ширина и размер корня прежние: пересчёт мог прийти
		// только от наблюдателя списка
		await expect
			.poll(() => activeTab().getBoundingClientRect().left)
			.toBeLessThan(before.left - EPSILON)
		expect(activeTab().getBoundingClientRect().width).toBe(before.width)
		expect([root().offsetWidth, root().offsetHeight]).toEqual(rootSize)

		await expect.poll(() => misses(pseudoBox(bar(), '::after'))).toEqual([])
	})
})

/**
 * Отметку активного таба тема рисует на ряду, а место таба плагин меряет от
 * ряда. Слот `leading` стоит в ряду раньше списка, а `center` уводит табы от
 * края: отметка, отсчитанная не от того узла, ушла бы на ширину слота и поле
 * выравнивания.
 */
describe('отметка при слоте leading и выравнивании center', () => {
	/** Табы по центру со слотом `leading`; сцена шире табов. */
	const harness = (view?: 'contained' | 'outline') =>
		defineComponent({
			render: () =>
				h('div', { style: 'width: 640px' }, [
					h(
						Tabs,
						{ view, alignment: 'center' },
						{ leading: () => mark(48), default: tabItems },
					),
				]),
		})

	/** Табы стоят по центру, правее слота: иначе проверка шла бы без сдвига. */
	const expectShifted = () => {
		const leading = find('.so-tabs__leading').getBoundingClientRect()
		const first = find('.so-tabs-item').getBoundingClientRect()

		expect(first.left, 'табы отошли от слота').toBeGreaterThan(leading.right + EPSILON)
	}

	it('line: полоса — под активным табом', async () => {
		render(harness())

		await measured()
		expectShifted()

		await expect.poll(() => misses(pseudoBox(bar(), '::after'))).toEqual([])
	})

	it('contained: карточка — на активном табе', async () => {
		render(harness('contained'))

		await measured()
		expectShifted()

		await expect.poll(() => misses(pseudoBox(bar(), '::before'))).toEqual([])
	})

	/**
	 * Линия `outline` — `::before` до активного таба и `::after` после него, а
	 * между ними разрыв: от левого края таба (через пиксель его рамки) до
	 * правого.
	 */
	it('outline: разрыв линии — под активным табом', async () => {
		render(harness('outline'))

		await measured()
		expectShifted()

		const gap = () => {
			const start = pseudoBox(bar(), '::before')
			const end = pseudoBox(bar(), '::after')

			return new DOMRect(start.right - 1, start.top, end.left - start.right + 1, start.height)
		}

		await expect.poll(() => misses(gap())).toEqual([])
	})
})
