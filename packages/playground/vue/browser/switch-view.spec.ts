/**
 * Выключенная дорожка Switch на той поверхности, на которой переключатель
 * реально стоит, — в обеих цветовых схемах, по вычисленным стилям.
 *
 * Цвета решает дизайн, и тест их не знает (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Здесь — отношение, которое ломалось молча: дорожка
 * бралась ступенью 200, ступень отсчитывается от страницы, а
 * `--s-component-surface` в тёмной схеме сама равна ступени 200. На панели
 * Select и Popover выключенная дорожка совпадала с панелью, а рамки у неё
 * нет — от переключателя оставалась одна ручка.
 *
 * Меряется одно: насколько цвет ушёл от подложки В СТОРОНУ ТЕКСТА.
 * Направление тест берёт у текста самой подложки — в светлой схеме уйти от
 * поверхности значит потемнеть, в тёмной посветлеть, — поэтому ни одного
 * числа темы и ни одной ветки под схему здесь нет. Чем меряется — `./colors`,
 * общее с `button-view.spec.ts`. В jsdom цвета не вычисляются вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Switch } from '@soldy-ui/vue'

import { find, lightness, settled, shift, style } from './colors'

import '@soldy-ui/theme-oren'

/** Обе схемы: ломалось только в одной, а правило дорожки общее. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Подложки, на которых стоит переключатель: страница и поверхность контрола —
 * панели Select и Popover, слоты Input. Цвет берётся из токенов, поэтому в
 * каждой схеме он свой, а тест один. Текст подложки — оттуда же: по нему тест
 * узнаёт, в какую сторону от поверхности уходить.
 */
const BACKDROPS = {
	страница: 'var(--s-neutral-50)',
	'поверхность контрола': 'var(--s-component-surface)',
} as const

type TBackdrop = keyof typeof BACKDROPS

/**
 * Пороги заметности по светлоте OKLab. Оттенок тест не сторожит — только то,
 * что цвет от соседа вообще отличим, поэтому пороги с запасом ниже самого
 * слабого из случаев светлой схемы, на которую никто не жаловался.
 */
const VISIBLE_TRACK = 0.02
const VISIBLE_KNOB = 0.04

/**
 * Разброс, в котором вуаль считается отошедшей одинаково на всех подложках.
 * Он шире, чем у заливки кнопки: слой ступени 500 сдвигает светлоту тем
 * меньше, чем ближе к самой ступени 500 подложка, и у дорожки плотность слоя
 * вдвое выше — значит вдвое выше и разброс. Ступень на её месте расходилась бы
 * не на сотые, а на всю разницу поверхностей.
 */
const SAME = 0.03

/** Переключатели сцены: выключенный, включённый и выключенный с вариантом. */
const SWITCHES = {
	off: {},
	on: { value: true },
	accent: { variant: 'accent' },
} as const

type TSwitch = keyof typeof SWITCHES

/** Сцена: обе подложки, на каждой — все переключатели. */
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
						style: `background: ${color}; color: var(--s-component-text); padding: 8px; display: flex; gap: 8px`,
					},
					Object.entries(SWITCHES).map(([role, props]) =>
						h('span', { key: role, 'data-switch': role }, [h(Switch, props)]),
					),
				),
			),
		]),
})

/** Подложка по имени, её собственный цвет и сторона, где её текст. */
function backdropOf(name: TBackdrop): { root: HTMLElement; color: string; toward: number } {
	const root = find(`[data-backdrop="${name}"]`)
	const color = style(root).backgroundColor

	return { root, color, toward: Math.sign(shift(style(root).color, color)) }
}

/** Переключатель сцены: его дорожка и ручка. */
const trackOf = (root: ParentNode, role: TSwitch) =>
	find(`[data-switch="${role}"] .s-switch__track`, root)

/**
 * Насколько дорожка ушла от подложки в сторону текста. Направление даёт текст,
 * поэтому число положительно в обеих схемах; минус означает «ушло ЗА
 * поверхность» — ровно то, что ломалось в тёмной схеме.
 */
function track(name: TBackdrop, role: TSwitch = 'off'): number {
	const { root, color, toward } = backdropOf(name)

	return shift(style(trackOf(root, role)).backgroundColor, color) * toward
}

/**
 * Насколько ручка отличима от дорожки под ней — без знака: в светлой схеме
 * белая ручка светлее дорожки, в тёмной берёт ступень у другого конца шкалы.
 *
 * Слоями, а не цветом ручки: дорожка полупрозрачна (вуаль), и одна её запись
 * без подложки под ней ничего не значит.
 */
function knob(name: TBackdrop, role: TSwitch = 'off'): number {
	const { root, color } = backdropOf(name)
	const element = trackOf(root, role)
	const rail = style(element).backgroundColor
	const thumb = style(find('.s-switch__track--thumb', element)).backgroundColor

	return Math.abs(lightness([color, rail, thumb]) - lightness([color, rail]))
}

/** Сцена в заданной схеме, указатель уведён со всех переключателей. */
async function show(scheme: (typeof SCHEMES)[number]): Promise<void> {
	document.documentElement.dataset.theme = scheme
	render(scene)

	await userEvent.hover(find('.s-test-away'))
	await settled(document.body)
}

/** Навести указатель на переключатель и дождаться, пока доиграет переход. */
async function hover(name: TBackdrop, role: TSwitch = 'off'): Promise<void> {
	const { root } = backdropOf(name)

	// На сам переключатель, а не на дорожку: поле лежит поверх неё, и на
	// перекрытый узел указатель не встанет.
	await userEvent.hover(find(`[data-switch="${role}"] .s-switch`, root))
	await settled(document.body)
}

/** Случай «схема × подложка»: дорожка обязана держаться на каждой из них. */
const CASES = SCHEMES.flatMap((scheme) =>
	(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) => ({ scheme, backdrop })),
)

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('выключенная дорожка отходит от своей поверхности', () => {
	it.each(CASES)('$scheme, $backdrop: дорожка видна на подложке', async (scenario) => {
		await show(scenario.scheme)

		expect(track(scenario.backdrop)).toBeGreaterThan(VISIBLE_TRACK)
	})

	it.each(CASES)('$scheme, $backdrop: наведение уводит дорожку дальше', async (scenario) => {
		await show(scenario.scheme)

		const resting = track(scenario.backdrop)

		await hover(scenario.backdrop)

		expect(track(scenario.backdrop)).toBeGreaterThan(resting)
	})

	/**
	 * Суть вуали: она считает не от страницы, а от того, что под дорожкой,
	 * поэтому расстояние до подложки одно и то же везде. Ступенью это не
	 * выражалось — на поверхности контрола тёмной схемы дорожка совпадала с
	 * подложкой, то есть уходила в ноль.
	 */
	it('на обеих подложках и в обеих схемах отходит одинаково', async () => {
		const shifts: number[] = []

		for (const { scheme, backdrop } of CASES) {
			await show(scheme)
			shifts.push(track(backdrop))
			cleanup()
		}

		expect(Math.max(...shifts) - Math.min(...shifts)).toBeLessThan(SAME)
	})

	/**
	 * Зачем дорожке вообще расстояние до поверхности: на ней стоит ручка, и
	 * она обязана быть отличима (`--s-component-knob`). Уведи дорожку ближе к
	 * подложке — пропадёт ручка, а не только сама дорожка.
	 */
	it.each(CASES)('$scheme, $backdrop: ручка отличима от дорожки', async (scenario) => {
		await show(scenario.scheme)

		expect(knob(scenario.backdrop)).toBeGreaterThan(VISIBLE_KNOB)
	})
})

describe('включённая дорожка стоит на шкале сама', () => {
	/**
	 * У насыщенной заливки своё место на шкале есть, и вуалью она не
	 * красится: на поверхности она видна дальше выключенной в любой схеме.
	 */
	it.each(CASES)(
		'$scheme, $backdrop: уходит от подложки дальше выключенной',
		async (scenario) => {
			await show(scenario.scheme)

			expect(track(scenario.backdrop, 'on')).toBeGreaterThan(track(scenario.backdrop, 'off'))
		},
	)
})

describe('цвет дорожки — из семейства переключателя', () => {
	/** Вуаль берёт ступень 500 своего семейства, а не нейтрали. */
	it.each(CASES)('$scheme, $backdrop: дорожка варианта — не нейтраль', async (scenario) => {
		await show(scenario.scheme)

		const { root } = backdropOf(scenario.backdrop)

		expect(style(trackOf(root, 'accent')).backgroundColor).not.toBe(
			style(trackOf(root, 'off')).backgroundColor,
		)
	})
})
