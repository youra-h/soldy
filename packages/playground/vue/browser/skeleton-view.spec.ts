/**
 * Заглушка Skeleton на той поверхности, на которой она реально стоит, — в
 * обеих цветовых схемах, по вычисленным стилям.
 *
 * Цвета вида решает дизайн, и тест их не знает (`themes/oren/AGENTS.md`, «Что
 * тестом не проверяется»). Здесь — отношение, которое ломалось молча:
 * заглушка бралась ступенью 100, а ступень отсчитана от страницы. На
 * поверхности контрола тёмной схемы — панели Dialog, Popover и Drawer, где
 * поверхность сама ступени 200, — заглушка была темнее панели: не
 * приподнималась над ней, а уходила под неё.
 *
 * Меряется то же, что у видов Button и линий Tabs: насколько цвет ушёл от
 * подложки В СТОРОНУ ТЕКСТА. Направление тест берёт у текста самой подложки,
 * поэтому ни одного числа темы и ни одной ветки под схему здесь нет. Чем
 * меряется — `./colors`. Пульсация заглушки — прозрачностью всего узла, а не
 * цветом фона: фон тест читает и посреди неё, и ждать её конца нечего — она
 * бесконечна. В jsdom цвета не вычисляются вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import type { TComponentVariant } from '@soldy-ui/core'
import { Button, Skeleton } from '@soldy-ui/vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'

import { find, pixel, shift, style } from './colors'

import '@soldy-ui/theme-oren'

/** Обе схемы: ломалось только в тёмной, а заглушка у схем общая. */
const SCHEMES = ['oren', 'oren-dark'] as const

type TScheme = (typeof SCHEMES)[number]

/**
 * Подложки, на которых стоит заглушка: страница и поверхность контрола —
 * панели Dialog, Popover и Drawer, карточки. Цвет берётся из токенов, поэтому
 * в каждой схеме он свой, а тест один.
 */
const BACKDROPS = {
	страница: 'var(--so-neutral-50)',
	'поверхность контрола': 'var(--so-component-surface)',
} as const

type TBackdrop = keyof typeof BACKDROPS

/**
 * Сцена: обе подложки, на каждой — заглушка каждого варианта темы, `normal`
 * тоже, и эталон — нейтральная залитая кнопка: её заливка — вуаль той
 * плотности, которой «на шаг от своей поверхности» отходит и заглушка.
 */
const scene = defineComponent({
	render: () =>
		h(
			'div',
			Object.entries(BACKDROPS).map(([name, color]) =>
				h(
					'div',
					{
						key: name,
						'data-backdrop': name,
						style: `background: ${color}; color: var(--so-component-text); padding: 8px; display: flex; flex-direction: column; gap: 8px`,
					},
					[
						h('div', { key: 'эталон', 'data-filled': '' }, [
							h(Button, { view: 'filled', text: 'Заливка' }),
						]),
						...COMPONENT_VARIANTS.map((variant) =>
							h('div', { key: variant, 'data-variant': variant }, [
								h(Skeleton, { variant, width: 120, height: 16 }),
							]),
						),
					],
				),
			),
		),
})

type TBackdropUnder = { root: HTMLElement; color: string; toward: number }

/** Подложка по имени, её собственный цвет и сторона, где её текст. */
function backdropOf(name: TBackdrop): TBackdropUnder {
	const root = find(`[data-backdrop="${name}"]`)
	const color = style(root).backgroundColor

	return { root, color, toward: Math.sign(shift(style(root).color, color)) }
}

/** Цвет заглушки варианта — фон её узла. */
const placeholderOf = (under: TBackdropUnder, variant: TComponentVariant): string =>
	style(find(`[data-variant="${variant}"] .so-skeleton__placeholder`, under.root)).backgroundColor

/**
 * Сцена в заданной схеме. Переходов у заглушки нет, а пульсация — не цвет:
 * ждать нечего.
 */
function show(scheme: TScheme): void {
	document.documentElement.dataset.soTheme = scheme
	render(scene)
}

/** Случай «схема × подложка»: заглушка обязана держаться на каждой из них. */
const CASES = SCHEMES.flatMap((scheme) =>
	(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) => ({ scheme, backdrop })),
)

/** То же самое по вариантам темы: заглушку красит семейство варианта. */
const VARIANT_CASES = CASES.flatMap((scenario) =>
	COMPONENT_VARIANTS.map((variant) => ({ ...scenario, variant })),
)

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('заглушка отходит от своей поверхности', () => {
	/**
	 * Минус — «ушла ЗА поверхность»: так было у каждого варианта на
	 * поверхности контрола тёмной схемы. Вуаль считает от того, что под
	 * заглушкой.
	 */
	it.each(VARIANT_CASES)(
		'$scheme, $backdrop, $variant: в сторону текста, а не за поверхность',
		(scenario) => {
			show(scenario.scheme)

			const under = backdropOf(scenario.backdrop)

			expect(
				shift(placeholderOf(under, scenario.variant), under.color) * under.toward,
			).toBeGreaterThan(0)
		},
	)

	/**
	 * Заглушка значит «на шаг от своей поверхности» — то же, что заливка
	 * нейтрального `filled`, — и у нейтрали она того же цвета: одна вуаль, а
	 * не своя плотность. Как далеко и одинаково ли везде отходит сама заливка,
	 * сторожит `button-view.spec.ts`.
	 */
	it.each(CASES)(
		'$scheme, $backdrop: у нейтрали — цвета заливки нейтрального filled',
		(scenario) => {
			show(scenario.scheme)

			const under = backdropOf(scenario.backdrop)
			const filled = style(find('[data-filled] .so-button', under.root)).backgroundColor

			expect([...pixel([under.color, placeholderOf(under, 'normal')])]).toEqual([
				...pixel([under.color, filled]),
			])
		},
	)
})
