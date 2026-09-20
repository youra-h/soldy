/**
 * Виды Button на той поверхности, на которой кнопка реально стоит, — в обеих
 * цветовых схемах, по вычисленным стилям.
 *
 * Цвета вида решает дизайн, и тест их не знает (`themes/oren/AGENTS.md`,
 * «Что тестом не проверяется»). Здесь — отношение, которое ломалось молча:
 * ступень шкалы отсчитывается от страницы, а `--s-component-surface` в тёмной
 * схеме сама равна ступени 200. Поэтому на панели Select и Popover рамка
 * нейтрального `outlined` была ровно цвета панели, заливка нейтрального
 * `filled` — темнее панели, то есть ЗА ней, а её наведение с панелью
 * совпадало.
 *
 * Меряется одно: насколько цвет ушёл от подложки В СТОРОНУ ТЕКСТА. Направление
 * тест берёт у самого текста кнопки — в светлой схеме уйти от поверхности
 * значит потемнеть, в тёмной посветлеть, — поэтому ни одного числа темы и ни
 * одной ветки под схему здесь нет. В jsdom цвета не вычисляются вовсе.
 *
 * Чем меряется — `./colors`: счёт светлоты общий с `switch-view.spec.ts`.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Button, Tags, TagsItem } from '@soldy/ui-vue'

import { find, opacity, settled, shift, style } from './colors'

import '@soldy/theme-oren'

/** Обе схемы: ломалось только в одной, а условие у видов общее. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Подложки, на которых стоит кнопка: страница и поверхность контрола — панели
 * Select и Popover, слоты Input, карточка активного таба. Цвет берётся из
 * токенов, поэтому в каждой схеме он свой, а тест один.
 */
const BACKDROPS = {
	страница: 'var(--s-neutral-50)',
	'поверхность контрола': 'var(--s-component-surface)',
} as const

type TBackdrop = keyof typeof BACKDROPS

/**
 * Пороги заметности по светлоте OKLab. Оттенок тест не сторожит — только то,
 * что цвет от подложки вообще отличим, поэтому пороги с запасом ниже самого
 * слабого из случаев светлой схемы, на которую никто не жаловался. У заливки
 * он свой: это вуаль в считанные проценты, а рамка — линия.
 */
const VISIBLE_FILL = 0.02
const VISIBLE_BORDER = 0.04

/** Разброс, в котором вуаль считается отошедшей одинаково на всех подложках. */
const SAME = 0.02

/** Сцена: обе подложки, на каждой — оба вида кнопки и пилюля тега. */
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
						style: `background: ${color}; padding: 8px; display: flex; gap: 8px`,
					},
					[
						h(Button, { view: 'filled', text: 'Заливка' }),
						h(Button, { view: 'outlined', text: 'Рамка' }),
						h(Tags, null, () => [h(TagsItem, { key: 'a', value: 'a', text: 'Тег' })]),
					],
				),
			),
		]),
})

/** Подложка по имени и её собственный цвет. */
function backdropOf(name: TBackdrop): { root: HTMLElement; color: string } {
	const root = find(`[data-backdrop="${name}"]`)

	return { root, color: style(root).backgroundColor }
}

/**
 * Насколько фон и рамка части ушли от подложки в сторону текста. Направление
 * даёт сам текст, поэтому число положительно в обеих схемах; минус означает
 * «ушло ЗА поверхность» — ровно то, что ломалось в тёмной схеме.
 */
function look(name: TBackdrop, selector: string): { background: number; border: number } {
	const { root, color } = backdropOf(name)
	const element = find(selector, root)
	const toward = Math.sign(shift(style(element).color, color))

	return {
		background: shift(style(element).backgroundColor, color) * toward,
		border: shift(style(element).borderTopColor, color) * toward,
	}
}

/** Сцена в заданной схеме, указатель уведён со всех кнопок. */
async function show(scheme: (typeof SCHEMES)[number]): Promise<void> {
	document.documentElement.dataset.theme = scheme
	render(scene)

	await userEvent.hover(find('.s-test-away'))
	await settled(document.body)
}

/** Навести указатель на часть и дождаться, пока доиграет её переход. */
async function hover(name: TBackdrop, selector: string): Promise<void> {
	const { root } = backdropOf(name)

	await userEvent.hover(find(selector, root))
	await settled(document.body)
}

/** Случай «схема × подложка»: вид обязан держаться на каждой из них. */
const CASES = SCHEMES.flatMap((scheme) =>
	(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) => ({ scheme, backdrop })),
)

const FILLED = '.s-button--view-filled'
const OUTLINED = '.s-button--view-outlined'

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('filled: нейтральная заливка отходит от своей поверхности', () => {
	it.each(CASES)('$scheme, $backdrop: заливка видна на подложке', async (scenario) => {
		await show(scenario.scheme)

		expect(look(scenario.backdrop, FILLED).background).toBeGreaterThan(VISIBLE_FILL)
	})

	it.each(CASES)('$scheme, $backdrop: наведение уводит дальше заливки', async (scenario) => {
		await show(scenario.scheme)

		const resting = look(scenario.backdrop, FILLED).background

		await hover(scenario.backdrop, FILLED)

		expect(look(scenario.backdrop, FILLED).background).toBeGreaterThan(resting)
	})

	/**
	 * Суть вуали: она считает не от страницы, а от того, что под кнопкой,
	 * поэтому расстояние до подложки одно и то же везде. Ступенью это не
	 * выражалось — на поверхности контрола тёмной схемы заливка уходила за
	 * подложку, то есть в минус.
	 */
	it('на обеих подложках и в обеих схемах отходит одинаково', async () => {
		const shifts: number[] = []

		for (const { scheme, backdrop } of CASES) {
			await show(scheme)
			shifts.push(look(backdrop, FILLED).background)
			cleanup()
		}

		expect(Math.max(...shifts) - Math.min(...shifts)).toBeLessThan(SAME)
	})

	/**
	 * Пилюлю тега рисует тот же миксин вида, а в поле Select она стоит на
	 * поверхности контрола — там она и была темнее поля.
	 */
	it.each(CASES)('$scheme, $backdrop: пилюля тега залита как кнопка', async (scenario) => {
		await show(scenario.scheme)

		expect(look(scenario.backdrop, '.s-tags-item').background).toBeCloseTo(
			look(scenario.backdrop, FILLED).background,
			5,
		)
	})
})

describe('outlined: рамка видна на своей поверхности', () => {
	it.each(CASES)('$scheme, $backdrop: рамка отличима от подложки', async (scenario) => {
		await show(scenario.scheme)

		expect(look(scenario.backdrop, OUTLINED).border).toBeGreaterThan(VISIBLE_BORDER)
	})

	it.each(CASES)('$scheme, $backdrop: наведение уводит рамку дальше', async (scenario) => {
		await show(scenario.scheme)

		const resting = look(scenario.backdrop, OUTLINED).border

		await hover(scenario.backdrop, OUTLINED)

		expect(look(scenario.backdrop, OUTLINED).border).toBeGreaterThan(resting)
	})

	/** Своего фона у вида нет, поэтому состояния ему даёт вуаль, а не ступень. */
	it.each(CASES)('$scheme, $backdrop: в покое фона нет вовсе', async (scenario) => {
		await show(scenario.scheme)

		const { root } = backdropOf(scenario.backdrop)

		expect(opacity(style(find(OUTLINED, root)).backgroundColor)).toBe(0)
	})

	it.each(CASES)('$scheme, $backdrop: наведение красит фон от подложки', async (scenario) => {
		await show(scenario.scheme)
		await hover(scenario.backdrop, OUTLINED)

		expect(look(scenario.backdrop, OUTLINED).background).toBeGreaterThan(VISIBLE_FILL)
	})
})
