/**
 * Рамка табов на той поверхности, на которой табы реально стоят, — в обеих
 * цветовых схемах, по вычисленным стилям.
 *
 * Цвета вида решает дизайн, и тест их не знает (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Здесь — отношение, которое ломалось молча: рамка
 * таба и линия под списком брались ступенью 200, а роль ступени 200 —
 * поверхность, не граница. В тёмной схеме `--s-component-surface` равна ей же,
 * и на панели Select и Popover рамка у `view="outline"` совпадала с подложкой:
 * от «папочных вкладок» не оставалось ни одной линии.
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
import { defineComponent, h } from 'vue'
import { Tabs, TabsItem } from '@soldy/ui-vue'

import { find, settled, shift, style } from './colors'

import '@soldy/theme-oren'

/** Обе схемы: ломалось только в одной, а ступень у линий общая. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Подложки, на которых стоят табы: страница и поверхность контрола — панели
 * Select и Popover, карточки. Цвет берётся из токенов, поэтому в каждой схеме
 * он свой, а тест один.
 */
const BACKDROPS = {
	страница: 'var(--s-neutral-50)',
	'поверхность контрола': 'var(--s-component-surface)',
} as const

type TBackdrop = keyof typeof BACKDROPS

/**
 * Виды с линиями: `outline` — рамка вокруг таба плюс линия под списком, вид по
 * умолчанию (`line`) — одна линия под списком. Значения у вида по умолчанию
 * нет намеренно: он и ломался бы без модификатора. `contained` сюда не входит —
 * ни рамки, ни линии у него нет вовсе, активный таб там карточка.
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

/** Табы одного вида: первый активен — у `outline` под ним разрыв в линии. */
const tabs = (view: (typeof VIEWS)[TView]) =>
	h(
		Tabs,
		{ view },
		{
			default: () =>
				TABS.map((text, index) =>
					h(TabsItem, { key: text, value: String(index), text, active: index === 0 }),
				),
		},
	)

/** Сцена: обе подложки, на каждой — оба вида табов. */
const scene = defineComponent({
	render: () =>
		h('div', [
			h('div', { class: 's-test-away', style: 'height: 24px' }),
			...Object.entries(BACKDROPS).map(([name, color]) =>
				h(
					'div',
					{
						key: name,
						'data-backdrop': name,
						style: `background: ${color}; color: var(--s-component-text); padding: 8px; display: flex; flex-direction: column; gap: 16px`,
					},
					Object.entries(VIEWS).map(([role, view]) =>
						h('div', { key: role, 'data-view': role }, [tabs(view)]),
					),
				),
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

const listOf = (under: TBackdropUnder, view: TView): HTMLElement =>
	find(`[data-view="${view}"] .s-tabs__list`, under.root)

/** Рамка таба — только у `outline`; ступень у всех табов вида одна. */
function border(name: TBackdrop): number {
	const under = backdropOf(name)
	const tab = find(`[data-view="outline"] .s-tabs-item`, under.root)

	return away(style(tab).borderTopColor, under)
}

/**
 * Линия под списком. У вида по умолчанию это граница самого списка, у
 * `outline` — `::before`: там линия разрезана под активным табом на две части,
 * и своего узла у неё нет.
 */
function line(name: TBackdrop, view: TView): number {
	const under = backdropOf(name)
	const list = listOf(under, view)
	const color =
		view === 'outline' ? style(list, '::before').backgroundColor : style(list).borderBottomColor

	return away(color, under)
}

/** Полоса под активным табом — `::after` списка у вида по умолчанию. */
function indicator(name: TBackdrop): number {
	const under = backdropOf(name)

	return away(style(listOf(under, 'по умолчанию'), '::after').backgroundColor, under)
}

/** Сцена в заданной схеме, указатель уведён со всех табов. */
async function show(scheme: (typeof SCHEMES)[number]): Promise<void> {
	document.documentElement.dataset.theme = scheme
	render(scene)

	await userEvent.hover(find('.s-test-away'))
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

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
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
