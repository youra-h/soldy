/**
 * Индикатор в кнопке — ProgressSpinner и ProgressLinear — в обеих цветовых
 * схемах, по вычисленным стилям.
 *
 * Своя ступень 600 варианта индикатору в кнопке не годится: дуга `accent` на
 * насыщенной заливке `filled` той же кнопки (ступень 500) почти сливалась с
 * ней, а на заливке другого варианта спорила с ней цветом. Поэтому индикатор
 * без варианта красится от кнопки: дуга — цветом её текста, дорожка — вуалью
 * того же цвета (`themes/oren/AGENTS.md`, «Индикатор в кнопке красится от
 * кнопки»). Правило одно на все виды кнопки, и сторож проверяет все.
 *
 * Палитры тест не знает, как и сторож видов Button (`button-view.spec.ts`):
 * мера — текст самой кнопки. Его тема держит читаемым на фоне кнопки в любом
 * виде и варианте, и дуга обязана отходить от фона не меньше, чем он.
 * Дорожка — в ту же сторону, но тише дуги: сольётся с фоном — пропадёт
 * кольцо, сравняется с дугой — не видно, что крутится и сколько готово.
 *
 * Заданный вариант — выбор потребителя, и кнопка его не перекрывает: так у
 * темы устроен любой вид по контексту (`themes/oren/AGENTS.md`, «Вид по
 * контексту»).
 *
 * Чем меряется — `./colors`. В jsdom цвета не вычисляются вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, type VNode } from 'vue'
import type { TButtonView, TComponentVariant } from '@soldy-ui/core'
import { Button, ProgressLinear, ProgressSpinner } from '@soldy-ui/vue'
import { BUTTON_VIEWS, COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'

import { find, lightness, pixel, style } from './colors'
import { forcedColors } from './media'
import { transitionEvents } from './transitions'

import '@soldy-ui/theme-oren'

/** Обе схемы: заливка с вариантом в них разная, а правило одно. */
const SCHEMES = ['oren', 'oren-dark'] as const

type TScheme = (typeof SCHEMES)[number]

/**
 * Подложки, на которых стоит кнопка: страница и поверхность контрола — панели
 * Select и Popover, карточка. Нейтральная заливка и прозрачные виды берут фон
 * у подложки, поэтому проверяются обе.
 */
const BACKDROPS = {
	страница: 'var(--s-neutral-50)',
	'поверхность контрола': 'var(--s-component-surface)',
} as const

type TBackdrop = keyof typeof BACKDROPS

/** Варианты кнопки: без варианта — нейтраль, и каждый вариант темы. */
const BUTTON_VARIANTS: readonly (TComponentVariant | undefined)[] = [
	undefined,
	...COMPONENT_VARIANTS,
]

/**
 * Пороги по светлоте OKLab. Дорожка — вуаль, и порог у неё тот же, что у
 * вуали-заливки в `button-view.spec.ts`; дуга от дорожки отличима, как рамка
 * `outlined` от подложки там же. Допуск — на сложение слоёв в sRGB.
 */
const VISIBLE_TRACK = 0.02
const VISIBLE_FILL = 0.04
const ROUNDING = 0.005

interface IIndicator {
	name: string
	/** Корень индикатора. */
	block: string
	/** Индикатор, как его кладут в кнопку: с долей, если она у него есть. */
	render: (variant?: TComponentVariant) => VNode
	/** Цвета частей, которые красит тема: дуги, которая сообщает, и дорожки под ней. */
	colors: (root: HTMLElement) => { fill: string; track: string }
}

/** Часть рисунка по селектору; нет её — тест падает здесь, а не на чтении свойства. */
function part(root: Element, selector: string): Element {
	const element = root.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

const INDICATORS: readonly IIndicator[] = [
	{
		name: 'ProgressSpinner',
		block: '.s-progress-spinner',
		render: (variant) => h(ProgressSpinner, { variant, value: 40 }),
		colors: (root) => ({
			fill: style(part(root, '.s-progress-spinner__range')).stroke,
			track: style(part(root, '.s-progress-spinner__track')).stroke,
		}),
	},
	{
		name: 'ProgressLinear',
		block: '.s-progress-linear',
		render: (variant) => h(ProgressLinear, { variant, value: 40 }),
		// Корень и есть дорожка
		colors: (root) => ({
			fill: style(part(root, '.s-progress-linear__range')).backgroundColor,
			track: style(root).backgroundColor,
		}),
	},
]

/** Индикатор перед текстом кнопки. */
const inButton = (
	indicator: IIndicator,
	button: { view?: TButtonView; variant?: TComponentVariant },
	variant?: TComponentVariant,
): VNode =>
	h(Button, { ...button, text: 'Сохраняем' }, { leading: () => indicator.render(variant) })

/** Случай сцены: кнопка вида и варианта на подложке. */
interface ICase {
	backdrop: TBackdrop
	view: TButtonView
	variant: TComponentVariant | undefined
}

const CASES: readonly ICase[] = (Object.keys(BACKDROPS) as TBackdrop[]).flatMap((backdrop) =>
	BUTTON_VIEWS.flatMap((view) => BUTTON_VARIANTS.map((variant) => ({ backdrop, view, variant }))),
)

const caseName = ({ backdrop, view, variant }: ICase) =>
	`${backdrop} · ${view} · ${variant ?? 'без варианта'}`

/** Подложка со всеми своими случаями: на каждый — кнопка с индикатором без варианта. */
const backdropRow = (backdrop: TBackdrop, indicator: IIndicator): VNode =>
	h(
		'div',
		{
			key: backdrop,
			'data-backdrop': backdrop,
			style: `background: ${BACKDROPS[backdrop]}; padding: 8px; display: flex; flex-wrap: wrap; gap: 8px`,
		},
		CASES.filter((scenario) => scenario.backdrop === backdrop).map((scenario) =>
			h('div', { key: caseName(scenario), 'data-case': caseName(scenario) }, [
				inButton(indicator, { view: scenario.view, variant: scenario.variant }),
			]),
		),
	)

/** Все случаи в схеме, указатель уведён со всех кнопок: наведение меняет их фон. */
async function showCases(scheme: TScheme, indicator: IIndicator): Promise<void> {
	document.documentElement.dataset.theme = scheme

	render(
		defineComponent({
			render: () =>
				h('div', [
					h('div', { class: 's-test-away', style: 'height: 24px' }),
					...(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) =>
						backdropRow(backdrop, indicator),
					),
				]),
		}),
	)

	await userEvent.hover(find('.s-test-away'))
	await transitionEvents()
}

/**
 * Что нарушено в случае. Расстояния от фона кнопки меряются в сторону её
 * текста, поэтому числа положительны в обеих схемах. Фон — фон кнопки поверх
 * подложки: у прозрачных видов и нейтральной заливки он свой у каждой
 * подложки.
 */
function faultsOf(scenario: ICase, indicator: IIndicator): string[] {
	const backdrop = find(`[data-backdrop="${scenario.backdrop}"]`)
	const button = find('.s-button', find(`[data-case="${caseName(scenario)}"]`, backdrop))
	const under = [style(backdrop).backgroundColor, style(button).backgroundColor]
	const { fill, track } = indicator.colors(find(indicator.block, button))
	const base = lightness(under)
	const textShift = lightness([...under, style(button).color]) - base
	const toward = Math.sign(textShift)
	const text = textShift * toward
	const fillShift = (lightness([...under, fill]) - base) * toward
	const trackShift = (lightness([...under, track]) - base) * toward
	// У кольца и полосы дуга лежит поверх дорожки
	const fillOnTrack = (lightness([...under, track, fill]) - lightness([...under, track])) * toward

	const name = caseName(scenario)
	const faults: string[] = []

	if (fillShift < text - ROUNDING) {
		faults.push(`${name}: дуга ${fillShift.toFixed(3)} от фона, текст ${text.toFixed(3)}`)
	}

	if (trackShift < VISIBLE_TRACK) {
		faults.push(`${name}: дорожка ${trackShift.toFixed(3)} от фона`)
	}

	if (fillOnTrack < VISIBLE_FILL) {
		faults.push(`${name}: дуга ${fillOnTrack.toFixed(3)} от дорожки`)
	}

	return faults
}

/**
 * Индикатор в нескольких местах на странице. Отдаёт цвета его частей по месту
 * — байтами sRGB вместе с прозрачностью: запись браузера сравнивать нельзя.
 */
async function showPlaces(
	indicator: IIndicator,
	places: Record<string, () => VNode>,
): Promise<(place: string) => { fill: number[]; track: number[] }> {
	render(
		defineComponent({
			render: () =>
				h(
					'div',
					{ style: 'background: var(--s-neutral-50); padding: 8px' },
					Object.entries(places).map(([place, markup]) =>
						h('div', { key: place, 'data-place': place }, [markup()]),
					),
				),
		}),
	)
	await transitionEvents()

	return (place) => {
		const { fill, track } = indicator.colors(
			find(indicator.block, find(`[data-place="${place}"]`)),
		)

		return { fill: [...pixel([fill])], track: [...pixel([track])] }
	}
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(async () => {
	cleanup()
	await forcedColors('none')
})

describe.each(SCHEMES)('%s: индикатор без варианта красится от кнопки', (scheme) => {
	/**
	 * Нарушения собираются по всей сцене, а не до первого: сломанный случай
	 * редко бывает один, и отчёт сразу называет все — подложку, вид, вариант.
	 */
	it.each(INDICATORS)(
		'$name: дуга видна не хуже текста, дорожка — тише дуги',
		async (indicator) => {
			await showCases(scheme, indicator)

			expect(CASES.flatMap((scenario) => faultsOf(scenario, indicator))).toEqual([])
		},
	)
})

/**
 * Вариант, заданный индикатору, кнопка не перекрывает — ни один, `accent`
 * тоже: вне кнопки он совпадает с видом без варианта, а в кнопке вид без
 * варианта другой. Сверка — с тем же индикатором вне кнопки, поэтому палитра
 * тесту по-прежнему не нужна.
 */
describe('заданный вариант индикатора — выбор потребителя', () => {
	it.each(INDICATORS)('$name: в кнопке тех же цветов, что вне её', async (indicator) => {
		for (const scheme of SCHEMES) {
			document.documentElement.dataset.theme = scheme

			for (const variant of COMPONENT_VARIANTS) {
				const colorsAt = await showPlaces(indicator, {
					'в кнопке': () => inButton(indicator, { variant: 'accent' }, variant),
					'вне кнопки': () => indicator.render(variant),
				})

				expect(colorsAt('в кнопке'), `${scheme} · ${variant}`).toEqual(
					colorsAt('вне кнопки'),
				)
				cleanup()
			}
		}
	})

	it.each(INDICATORS)('$name: без варианта вне кнопки — `accent`', async (indicator) => {
		for (const scheme of SCHEMES) {
			document.documentElement.dataset.theme = scheme

			const colorsAt = await showPlaces(indicator, {
				'без варианта': () => indicator.render(),
				accent: () => indicator.render('accent'),
			})

			expect(colorsAt('без варианта'), scheme).toEqual(colorsAt('accent'))
			cleanup()
		}
	})
})

/**
 * Принудительные цвета (высокий контраст Windows): цвета индикатора в этом
 * режиме системные, и цвет кнопки правило режима не перебивает — кольцо и
 * полоса в кнопке те же, что вне её. Сами системные цвета сторожат спеки
 * индикаторов.
 */
describe('принудительные цвета', () => {
	it.each(INDICATORS)('$name: в кнопке — те же цвета, что вне её', async (indicator) => {
		await forcedColors('active')

		// Режим действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(forced-colors: active)').matches).toBe(true)

		for (const scheme of SCHEMES) {
			document.documentElement.dataset.theme = scheme

			const colorsAt = await showPlaces(indicator, {
				'в кнопке': () => inButton(indicator, { variant: 'accent' }),
				'вне кнопки': () => indicator.render(),
			})

			expect(colorsAt('в кнопке'), scheme).toEqual(colorsAt('вне кнопки'))
			cleanup()
		}
	})
})
