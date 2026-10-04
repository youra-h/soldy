/**
 * Вложенные Tabs в настоящем браузере: табы в панели других выглядят так же,
 * как такие же табы вне них, — вид, ориентация, выравнивание и вариант
 * внешних табов им не достаются.
 *
 * Тема рисует набор от его корня дочерними комбинаторами: свой список
 * (`> .s-tabs__list`), его табы (`> .s-tabs__list > .s-tabs-item`) и свою
 * панель (`> .s-tabs__panel`) — `themes/oren/AGENTS.md`, «Tabs: вид — от
 * своего списка». Пока правила вида были написаны для потомков, внутренние
 * табы получали стили внешних: горизонтальные под вертикальными
 * выстраивались столбиком, `contained` под `line` — с линией и полосой,
 * `line` под `outline` — папочными вкладками, а цвет текста и фон контейнера
 * брались от варианта внешних.
 *
 * Чисел темы тест не знает. Эталон — такие же внутренние табы в той же сцене,
 * но вне других: вычисленный стиль вложенных обязан совпасть с ним.
 * Расхождения собираются списком с именем свойства, и ждётся пустой список.
 * Виды, ориентации и выравнивания — списки стенда, сверенные с темой и ядром
 * (`@soldy-ui/playground-shared`): новое значение попадёт в матрицу само.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, type VNodeChild } from 'vue'
import type { ITabsProps, TTabsOrientation, TTabsView } from '@soldy-ui/core'
import { Tabs, TabsContent, TabsItem } from '@soldy-ui/vue'
import { TABS_ALIGNMENTS, TABS_ORIENTATIONS, TABS_VIEWS } from '@soldy-ui/playground-shared'

import { find, style } from './colors'

import '@soldy-ui/theme-oren'

/** Оформление набора — всё, от чего тема рисует его вид. */
type TTabsLook = Pick<ITabsProps, 'view' | 'orientation' | 'variant' | 'alignment' | 'position'>

/** Внешние табы: первый активен, в его панели — внутренние. */
const OUTER = ['Внешний', 'Соседний']

/** Внутренние табы: первый активен — у него карточка, полоса и разрыв линии. */
const INNER = ['Один', 'Два', 'Три']

/** Набор табов: первый активен, панель первого — `content` (`panel`). */
const tabs = (look: TTabsLook, texts: readonly string[], panel: () => VNodeChild) =>
	h(Tabs, look, {
		default: () =>
			texts.map((text, index) =>
				h(TabsItem, { key: text, value: String(index), text, active: index === 0 }),
			),
		content: () => h(TabsContent, { value: '0' }, panel),
	})

/** Внутренние табы — одни и те же во вложенном месте и в эталоне. */
const inner = (look: TTabsLook) => tabs(look, INNER, () => 'Панель')

/** Сцена: внешние табы с внутренними в панели и эталон — такие же внутренние вне них. */
const scene = (outerLook: TTabsLook, innerLook: TTabsLook) =>
	defineComponent({
		render: () =>
			h('div', { style: 'width: 640px' }, [
				h('div', { class: 's-test-away', style: 'height: 24px' }),
				h('div', { 'data-place': 'nested' }, [
					tabs(outerLook, OUTER, () => inner(innerLook)),
				]),
				h('div', { 'data-place': 'reference' }, [inner(innerLook)]),
			]),
	})

/** Корни наборов на сцене: внешние, вложенные и эталон. */
const roots = () => [...document.querySelectorAll('.s-tabs')]

const nested = () => find('[data-place="nested"] .s-tabs__panel > .s-tabs')
const reference = () => find('[data-place="reference"] > .s-tabs')

const SIDES = ['top', 'right', 'bottom', 'left'] as const

/** Рамка — по каждой стороне: толщина и цвет. */
const BORDER = SIDES.flatMap((side) => [`border-${side}-width`, `border-${side}-color`])

/** Скругление — по каждому углу. */
const RADIUS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'].map(
	(corner) => `border-${corner}-radius`,
)

/** Список: направление, выравнивание, рамка линии, контейнер `contained`. */
const LIST = [
	'flex-direction',
	'justify-content',
	...BORDER,
	...SIDES.map((side) => `padding-${side}`),
	'background-color',
	...RADIUS,
]

/**
 * Псевдоэлементы списка: полоса `line`, карточка `contained` и части линии
 * `outline` — есть ли они, видны ли и какого цвета.
 */
const LIST_MARK = ['content', 'visibility', 'background-color']

/** Обёртка таба: рамка и скругление `outline`, фон карточки, растяжка `stretch`. */
const TAB = [...BORDER, ...RADIUS, 'background-color', 'flex-grow', 'justify-content']

/** Вуаль неактивного таба `outline` — `::before` обёртки. */
const TAB_VEIL = ['content', 'opacity']

/** Строка выбранного таба: цвет текста от варианта. */
const ROW = ['color']

/** Панель: поля горизонтальных и рост в ряду вертикальных. */
const PANEL = ['margin-block-start', 'margin-block-end', 'flex-grow']

/** Вычисленные свойства узла под именем места: `список border-top-width`. */
const read = (place: string, element: Element, properties: readonly string[], pseudo?: string) => {
	const computed = style(element, pseudo)

	return properties.map(
		(property) => [`${place} ${property}`, computed.getPropertyValue(property)] as const,
	)
}

/** Вид набора табов — всё, что тема рисует от его корня. */
function stylesOf(root: HTMLElement): Map<string, string> {
	const list = find(':scope > .s-tabs__list', root)
	const items = [...list.querySelectorAll(':scope > .s-tabs-item')]
	const row = find(':scope > .s-tabs-item[data-selected="true"] > [role="tab"]', list)
	const panel = find(':scope > .s-tabs__panel', root)

	return new Map([
		...read('список', list, LIST),
		...read('список ::before', list, LIST_MARK, '::before'),
		...read('список ::after', list, LIST_MARK, '::after'),
		...items.flatMap((item, index) => [
			...read(`таб ${index + 1}`, item, TAB),
			...read(`таб ${index + 1} ::before`, item, TAB_VEIL, '::before'),
		]),
		...read('строка выбранного таба', row, ROW),
		...read('панель', panel, PANEL),
	])
}

/** Чем вложенные табы отличаются от эталона: свойство, его значение у них и у эталона. */
function misses(): string[] {
	const own = stylesOf(nested())
	const expected = stylesOf(reference())

	return [...new Set([...own.keys(), ...expected.keys()])]
		.filter((key) => own.get(key) !== expected.get(key))
		.map((key) => `${key}: ${own.get(key)}, эталон — ${expected.get(key)}`)
}

/**
 * Переходы доиграли: фон выбранной обёртки `contained` гаснет переходом,
 * когда карточку начинает рисовать список, цвет строки — когда указатель
 * ушёл. Перебитый переход отменяется, и его `finished` отклонён: для ожидания
 * это тоже конец.
 */
const quiet = (): Promise<unknown> =>
	Promise.all(
		document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
	)

/**
 * Сцена отрисована и устоялась: плагин темы записал геометрию на всех трёх
 * корнях (`--ready-animation`) — карточка `contained` уже псевдоэлемент
 * списка, — указатель уведён с табов, переходы доиграли.
 */
async function show(outerLook: TTabsLook, innerLook: TTabsLook): Promise<void> {
	render(scene(outerLook, innerLook))

	await expect
		.poll(() => roots().filter((root) => root.classList.contains('s-tabs--ready-animation')))
		.toHaveLength(3)
	await userEvent.hover(find('.s-test-away'))
	await quiet()
}

const ORIENTATION_NAMES: Record<TTabsOrientation, string> = {
	horizontal: 'горизонтальные',
	vertical: 'вертикальные',
}

/**
 * Внешние — с вариантом: его цвет внутренним доставаться не должен.
 * Вертикальные — ещё и у конца: у края свои правила рамки и линий.
 */
const outerOf = (view: TTabsView, orientation: TTabsOrientation): TTabsLook =>
	orientation === 'vertical'
		? { view, orientation, variant: 'accent', position: 'end' }
		: { view, orientation, variant: 'accent' }

/** Вид внешних × вид внутренних × ориентации тех и других. */
const VIEW_CASES = TABS_VIEWS.flatMap((outerView) =>
	TABS_ORIENTATIONS.flatMap((outerOrientation) =>
		TABS_VIEWS.flatMap((innerView) =>
			TABS_ORIENTATIONS.map((innerOrientation) => ({
				name: `${outerView} ${ORIENTATION_NAMES[outerOrientation]} → ${innerView} ${ORIENTATION_NAMES[innerOrientation]}`,
				outer: outerOf(outerView, outerOrientation),
				inner: { view: innerView, orientation: innerOrientation },
			})),
		),
	),
)

/**
 * Вариант внутренних — свой. Внешние — `caution`, внутренние — `accent`:
 * `caution` объявлен в теме позже, и правило внешних, доставшееся
 * внутренним, перебило бы их вариант одним порядком.
 */
const VARIANT_CASES = TABS_VIEWS.flatMap((outerView) =>
	TABS_VIEWS.map((innerView) => ({
		name: `${outerView} caution → ${innerView} accent`,
		outer: { view: outerView, variant: 'caution' } satisfies TTabsLook,
		inner: { view: innerView, variant: 'accent' } satisfies TTabsLook,
	})),
)

/** Выравнивание внешних — у списка и у его табов, внутренним оно не достаётся. */
const ALIGNMENT_CASES = TABS_ALIGNMENTS.flatMap((alignment) =>
	TABS_VIEWS.map((innerView) => ({
		name: `внешние ${alignment} → ${innerView}`,
		outer: { alignment } satisfies TTabsLook,
		inner: { view: innerView } satisfies TTabsLook,
	})),
)

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

/**
 * Случаи — циклом, а не `it.each`: имя случая длиннее порога, после которого
 * подстановка `$name` в заголовке обрезает строку, и случаи стали бы
 * неотличимы в отчёте.
 */
describe('вид и ориентация внешних табов', () => {
	for (const { name, outer, inner } of VIEW_CASES) {
		it(`${name}: внутренние — как вне других`, async () => {
			await show(outer, inner)

			expect(misses()).toEqual([])
		})
	}
})

describe('вариант внутренних табов — свой', () => {
	for (const { name, outer, inner } of VARIANT_CASES) {
		it(`${name}: внутренние — как вне других`, async () => {
			await show(outer, inner)

			expect(misses()).toEqual([])
		})
	}
})

describe('выравнивание внешних табов', () => {
	for (const { name, outer, inner } of ALIGNMENT_CASES) {
		it(`${name}: внутренние — как вне других`, async () => {
			await show(outer, inner)

			expect(misses()).toEqual([])
		})
	}
})
