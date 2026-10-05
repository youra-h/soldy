/**
 * Сторона линии у вертикальных Tabs в настоящем браузере: линия между списком
 * и панелью, полоса под активным табом `line` и открытая сторона папочных
 * вкладок `outline` лежат на краю списка, обращённом к панели, — при любом
 * направлении письма и у табов в начале и в конце ряда.
 *
 * Ряд набора — флекс, и в RTL список встаёт по другую сторону от панели.
 * Раньше тема задавала эти стороны физически — справа, у табов в конце ряда
 * слева, — и в RTL линия с полосой оставались на внешнем краю списка, вдали
 * от панели, а вкладки `outline` открывались наружу. Теперь стороны логические
 * (`themes/oren/AGENTS.md`, «сторона в раскладке — логическая»), и браузер
 * разворачивает их по ближайшему `dir` сам. Поэтому к LTR и RTL добавлены
 * вложенные случаи (`browser/directions.ts`).
 *
 * Чисел темы тест не знает: сторону панели он берёт из раскладки, а край
 * списка, полосу и линии меряет коробками. Проверен на физических сторонах:
 * падают все случаи с RTL.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import type { TTabsPosition } from '@soldy-ui/core'
import { Tabs, TabsContent, TabsItem } from '@soldy-ui/vue'

import { find } from './colors'
import { DIRECTION_CASES, setDir, sidesOf, type TLine, type TSide } from './directions'
import { pseudoBox } from './pseudo-box'

import '@soldy-ui/theme-oren'

/** Допуск на округление коробок, px: полоса выступает на пиксель за рамку. */
const EPSILON = 1.5

/** Активен средний таб: у `outline` линия списка есть и до него, и после. */
const TABS = ['Настройки', 'Почта', 'Архив']

type TLook = { view?: 'outline'; position: TTabsPosition }

/** Вертикальные табы у предка с направлением `ancestor`. */
function mount(look: TLook, direction?: TLine, ancestor?: TLine): void {
	render(
		defineComponent({
			render: () =>
				h('div', { dir: ancestor, style: 'width: 480px' }, [
					h(
						Tabs,
						{ ...look, orientation: 'vertical', direction },
						{
							default: () =>
								TABS.map((text, index) =>
									h(TabsItem, {
										key: text,
										value: String(index),
										text,
										active: index === 1,
									}),
								),
							content: () => h(TabsContent, { value: '1' }, () => 'Панель'),
						},
					),
				]),
		}),
	)
}

const root = () => find('.s-tabs')
const list = () => find('.s-tabs__list')
const panel = () => find('.s-tabs__panel')
const items = () => [...list().querySelectorAll<HTMLElement>(':scope > .s-tabs-item')]

/** Середина коробки по горизонтали. */
const middle = (box: DOMRect): number => box.left + box.width / 2

/** Сторона списка, у которой стоит панель. */
const panelSide = (): TSide =>
	middle(panel().getBoundingClientRect()) > middle(list().getBoundingClientRect())
		? 'right'
		: 'left'

const opposite = (side: TSide): TSide => (side === 'left' ? 'right' : 'left')

/** Псевдоэлемент списка лежит на его крае `side`: середина — на линии края. */
const onEdge = (pseudo: '::before' | '::after', side: TSide): number =>
	Math.abs(middle(pseudoBox(list(), pseudo)) - list().getBoundingClientRect()[side])

const borderWidth = (element: HTMLElement, side: TSide): string =>
	getComputedStyle(element).getPropertyValue(`border-${side}-width`)

/** Табы в начале ряда — у начала строки, панель — у её конца; в конце ряда — наоборот. */
const POSITIONS: readonly TTabsPosition[] = ['start', 'end']

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
	setDir(document.documentElement)
})

describe.each(DIRECTION_CASES)('вертикальные табы по ближайшему dir: $name', (scenario) => {
	const sides = sidesOf(scenario.line)

	/** Сцена отрисована, и плагин темы записал геометрию активного таба. */
	async function show(look: TLook): Promise<void> {
		setDir(document.documentElement, scenario.page)
		mount(look, scenario.direction, scenario.ancestor)

		await expect.poll(() => root().classList.contains('s-tabs--ready-animation')).toBe(true)
	}

	it.each(POSITIONS)('line, position %s: линия и полоса — у края к панели', async (position) => {
		await show({ position })

		const side = panelSide()

		expect(side, 'панель — у конца строки, у табов в конце ряда — у начала').toBe(
			position === 'start' ? sides.end : sides.start,
		)
		expect(borderWidth(list(), side), 'линия — к панели').toBe('1px')
		expect(borderWidth(list(), opposite(side)), 'с внешнего края линии нет').toBe('0px')
		expect(onEdge('::after', side), 'полоса — на линии').toBeLessThanOrEqual(EPSILON)
	})

	it.each(POSITIONS)(
		'outline, position %s: линия и открытая сторона вкладок — к панели',
		async (position) => {
			await show({ view: 'outline', position })

			const side = panelSide()

			expect(side).toBe(position === 'start' ? sides.end : sides.start)
			expect(onEdge('::before', side), 'линия до активного таба').toBeLessThanOrEqual(EPSILON)
			expect(onEdge('::after', side), 'линия после активного таба').toBeLessThanOrEqual(
				EPSILON,
			)

			for (const [index, item] of items().entries()) {
				expect(borderWidth(item, side), `таб ${index + 1} открыт к панели`).toBe('0px')
				expect(borderWidth(item, opposite(side)), `таб ${index + 1} закрыт снаружи`).toBe(
					'1px',
				)
			}
		},
	)
})
