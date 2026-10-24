/**
 * Рамка табов и подложка списка `contained` на той поверхности, на которой
 * табы реально стоят, — в обеих цветовых схемах, по вычисленным стилям.
 *
 * Цвета вида решает дизайн, и тест их не знает (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Здесь — отношение, которое ломалось молча: рамка
 * таба и линия под списком брались ступенью 200, а роль ступени 200 —
 * поверхность, не граница. В тёмной схеме `--so-component-surface` равна ей же,
 * и на панели Select и Popover рамка у `view="outline"` совпадала с подложкой:
 * от «папочных вкладок» не оставалось ни одной линии. Подложка списка
 * `contained` бралась ступенью 100 и на той же панели была темнее панели — не
 * приподнималась над ней, а уходила под неё.
 *
 * Меряется одно: насколько цвет ушёл от подложки В СТОРОНУ ТЕКСТА.
 * Направление тест берёт у текста самой подложки — в светлой схеме уйти от
 * поверхности значит потемнеть, в тёмной посветлеть, — поэтому ни одного числа
 * темы и ни одной ветки под схему здесь нет. Чем меряется — `./colors`, общее
 * с `button-view.spec.ts` и `switch-view.spec.ts`. В jsdom цвета не
 * вычисляются вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, type Component, type VNode } from 'vue'
import type { TComponentVariant } from '@soldy-ui/core'
import { Button, Tabs, TabsItem } from '@soldy-ui/vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'

import { find, pixel, settled, shift, style } from './colors'

import '@soldy-ui/theme-oren'

/** Обе схемы: ломалось только в одной, а ступень у линий общая. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Подложки, на которых стоят табы: страница и поверхность контрола — панели
 * Select и Popover, карточки. Цвет берётся из токенов, поэтому в каждой схеме
 * он свой, а тест один.
 */
const BACKDROPS = {
	страница: 'var(--so-neutral-50)',
	'поверхность контрола': 'var(--so-component-surface)',
} as const

type TBackdrop = keyof typeof BACKDROPS

/**
 * Виды с линиями: `outline` — рамка вокруг таба плюс линия под списком, вид по
 * умолчанию (`line`) — одна линия под списком. Значения у вида по умолчанию
 * нет намеренно: он и ломался бы без модификатора. `contained` сюда не входит —
 * ни рамки, ни линии у него нет вовсе, активный таб там карточка на подложке
 * списка (своя сцена ниже).
 */
const VIEWS = {
	outline: 'outline',
	'по умолчанию': undefined,
} as const

type TView = keyof typeof VIEWS

/**
 * Порог заметности по светлоте OKLab. Оттенок тест не сторожит — только то,
 * что линия от подложки вообще отличима, поэтому порог с запасом ниже самого
 * слабого из случаев светлой схемы, на которую никто не жаловался. Он тот же,
 * что у рамки Button: это такая же линия в один пиксель.
 */
const VISIBLE_BORDER = 0.04

const TABS = ['Первый', 'Второй', 'Третий']

/** Пропсы набора в сцене: вид и вариант. */
type TTabsLook = { view?: 'outline' | 'contained'; variant?: TComponentVariant }

/** Табы одного вида: первый активен — у `outline` под ним разрыв в линии. */
const tabs = (look: TTabsLook) =>
	h(Tabs, look, {
		default: () =>
			TABS.map((text, index) =>
				h(TabsItem, { key: text, value: String(index), text, active: index === 0 }),
			),
	})

/** Подложка сцены: её цвет и цвет её текста — по нему тест узнаёт направление. */
const backdrop = (name: string, color: string, children: VNode[]) =>
	h(
		'div',
		{
			key: name,
			'data-backdrop': name,
			style: `background: ${color}; color: var(--so-component-text); padding: 8px; display: flex; flex-direction: column; gap: 16px`,
		},
		children,
	)

/** Сцена: обе подложки, на каждой — оба вида табов. */
const scene = defineComponent({
	render: () =>
		h('div', [
			h('div', { class: 'so-test-away', style: 'height: 24px' }),
			...Object.entries(BACKDROPS).map(([name, color]) =>
				backdrop(
					name,
					color,
					Object.entries(VIEWS).map(([role, view]) =>
						h('div', { key: role, 'data-view': role }, [tabs({ view })]),
					),
				),
			),
		]),
})

/**
 * Сцена `contained`: обе подложки, на каждой — набор каждого варианта темы,
 * `normal` тоже, и эталон — нейтральная залитая кнопка: её заливка — вуаль той
 * плотности, которой «на шаг от своей поверхности» отходит и подложка списка.
 */
const containedScene = defineComponent({
	render: () =>
		h('div', [
			h('div', { class: 'so-test-away', style: 'height: 24px' }),
			...Object.entries(BACKDROPS).map(([name, color]) =>
				backdrop(name, color, [
					h('div', { key: 'эталон', 'data-filled': '' }, [
						h(Button, { view: 'filled', text: 'Заливка' }),
					]),
					...COMPONENT_VARIANTS.map((variant) =>
						h('div', { key: variant, 'data-variant': variant }, [
							tabs({ view: 'contained', variant }),
						]),
					),
				]),
			),
		]),
})

type TBackdropUnder = { root: HTMLElement; color: string; toward: number }

/** Подложка по имени, её собственный цвет и сторона, где её текст. */
function backdropOf(name: TBackdrop): TBackdropUnder {
	const root = find(`[data-backdrop="${name}"]`)
	const color = style(root).backgroundColor

	return { root, color, toward: Math.sign(shift(style(root).color, color)) }
}

/**
 * Насколько цвет ушёл от подложки в сторону текста. Направление даёт текст,
 * поэтому число положительно в обеих схемах; минус означает «ушло ЗА
 * поверхность» — ровно то, что ломалось в тёмной схеме.
 */
const away = (color: string, under: TBackdropUnder): number =>
	shift(color, under.color) * under.toward

/** Ряд набора — список табов и слоты по его краям: линию и полосу вид рисует на нём. */
const barOf = (under: TBackdropUnder, view: TView): HTMLElement =>
	find(`[data-view="${view}"] .so-tabs__bar`, under.root)

/** Рамка таба — только у `outline`; ступень у всех табов вида одна. */
function border(name: TBackdrop): number {
	const under = backdropOf(name)
	const tab = find(`[data-view="outline"] .so-tabs-item`, under.root)

	return away(style(tab).borderTopColor, under)
}

/**
 * Линия под списком. У вида по умолчанию это граница ряда, у `outline` —
 * `::before` ряда: там линия разрезана под активным табом на две части, и
 * своего узла у неё нет.
 */
function line(name: TBackdrop, view: TView): number {
	const under = backdropOf(name)
	const bar = barOf(under, view)
	const color =
		view === 'outline' ? style(bar, '::before').backgroundColor : style(bar).borderBottomColor

	return away(color, under)
}

/** Полоса под активным табом — `::after` ряда у вида по умолчанию. */
function indicator(name: TBackdrop): number {
	const under = backdropOf(name)

	return away(style(barOf(under, 'по умолчанию'), '::after').backgroundColor, under)
}

/** Подложка списка `contained` варианта — фон ряда: контейнер вида — он. */
const containerOf = (under: TBackdropUnder, variant: TComponentVariant): string =>
	style(find(`[data-variant="${variant}"] .so-tabs__bar`, under.root)).backgroundColor

/** Сцена в заданной схеме, указатель уведён со всех табов. */
async function show(scheme: (typeof SCHEMES)[number], component: Component = scene): Promise<void> {
	document.documentElement.dataset.soTheme = scheme
	render(component)

	await userEvent.hover(find('.so-test-away'))
	await settled(document.body)
}

/** Случай «схема × подложка»: линия обязана держаться на каждой из них. */
const CASES = SCHEMES.flatMap((scheme) =>
	(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) => ({ scheme, backdrop })),
)

/** То же самое, но ещё и по видам: линия под списком есть у обоих. */
const VIEW_CASES = CASES.flatMap((scenario) =>
	(Object.keys(VIEWS) as TView[]).map((view) => ({ ...scenario, view })),
)

/** То же самое по вариантам темы: подложку `contained` красит семейство варианта. */
const VARIANT_CASES = CASES.flatMap((scenario) =>
	COMPONENT_VARIANTS.map((variant) => ({ ...scenario, variant })),
)

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('линия под списком отходит от своей поверхности', () => {
	it.each(VIEW_CASES)(
		'$scheme, $backdrop, вид $view: линия отличима от подложки',
		async (scenario) => {
			await show(scenario.scheme)

			expect(line(scenario.backdrop, scenario.view)).toBeGreaterThan(VISIBLE_BORDER)
		},
	)
})

describe('outline: рамка таба отходит от своей поверхности', () => {
	it.each(CASES)('$scheme, $backdrop: рамка таба отличима от подложки', async (scenario) => {
		await show(scenario.scheme)

		expect(border(scenario.backdrop)).toBeGreaterThan(VISIBLE_BORDER)
	})

	/**
	 * Рамка таба и линия списка — одна ступень одного миксина: линия
	 * продолжает рамку по краю списка, и разойтись им нельзя.
	 */
	it.each(CASES)('$scheme, $backdrop: линия списка той же ступени', async (scenario) => {
		await show(scenario.scheme)

		expect(line(scenario.backdrop, 'outline')).toBeCloseTo(border(scenario.backdrop), 5)
	})
})

describe('полоса под активным табом стоит на шкале сама', () => {
	/**
	 * У насыщенной заливки своё место на шкале есть, и от ступени линии она не
	 * считается: пока полоса бралась арифметикой «линия + 400», подвинуть
	 * линию значило подвинуть и полосу.
	 */
	it.each(CASES)('$scheme, $backdrop: уходит от подложки дальше линии', async (scenario) => {
		await show(scenario.scheme)

		expect(indicator(scenario.backdrop)).toBeGreaterThan(
			line(scenario.backdrop, 'по умолчанию'),
		)
	})
})

describe('contained: подложка списка отходит от своей поверхности', () => {
	/**
	 * Ступень 100 отсчитана от страницы, а на поверхности контрола тёмной
	 * схемы (ступень 200) она темнее панели: подложка уходила под панель у
	 * каждого варианта. Вуаль считает от того, что под списком.
	 */
	it.each(VARIANT_CASES)(
		'$scheme, $backdrop, $variant: в сторону текста, а не за поверхность',
		async (scenario) => {
			await show(scenario.scheme, containedScene)

			const under = backdropOf(scenario.backdrop)

			expect(away(containerOf(under, scenario.variant), under)).toBeGreaterThan(0)
		},
	)

	/**
	 * Подложка значит «на шаг от своей поверхности» — то же, что заливка
	 * нейтрального `filled`, — и у нейтрали она того же цвета: одна вуаль, а
	 * не своя плотность. Как далеко и одинаково ли везде отходит сама заливка,
	 * сторожит `button-view.spec.ts`.
	 */
	it.each(CASES)(
		'$scheme, $backdrop: у нейтрали — цвета заливки нейтрального filled',
		async (scenario) => {
			await show(scenario.scheme, containedScene)

			const under = backdropOf(scenario.backdrop)
			const filled = style(find('[data-filled] .so-button', under.root)).backgroundColor

			expect([...pixel([under.color, containerOf(under, 'normal')])]).toEqual([
				...pixel([under.color, filled]),
			])
		},
	)
})
