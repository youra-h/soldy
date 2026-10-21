/**
 * Сигнал — насыщенная заливка, которая говорит «включено», «вот сколько» и
 * «вот этот», — одного цвета у всех компонентов одного варианта: включённая
 * дорожка Switch, заливка Slider, заливка доли ProgressLinear, дуга
 * ProgressSpinner, полоса под активным табом `line`, заливка Button `filled`,
 * текущая страница Pagination, отмеченная коробка CheckBox `filled`, отметка
 * флажка и радио и выбранный день Calendar. Рядом в форме они не спорят:
 * синий переключателя и синяя полоса загрузки — один синий
 * (`themes/oren/AGENTS.md`, «Тесты»). Раньше индикаторы и полоса таба стояли
 * своей ступенью, на шаг дальше от поверхности, чем переключатель.
 *
 * Ступень сигнала тема задаёт в одном месте (`mixins/_signal.scss`), и у
 * `caution` она своя — на ступень дальше остальных. Часть, которая написала бы
 * ступень сама, разошлась бы с остальными именно там. Наведение у сигнала
 * тоже одно: заливка Button `filled`, отмеченная коробка CheckBox `filled` и
 * выбранный день Calendar под указателем — одного цвета, и это не цвет покоя.
 *
 * Палитры спек не знает: эталон — включённая дорожка Switch того же варианта,
 * и с ней сверяются остальные. Сверка — байтами sRGB (`pixel`): запись цвета
 * у браузера сравнивать нельзя. Эталоны вариантов различимы — иначе сверка
 * прошла бы на любом цвете. Варианты — все, что объявляет тема, `normal` тоже:
 * у индикаторов он — нейтраль, а не база. Обе схемы: середина хроматических
 * шкал в них своя. В jsdom цвета не вычисляются вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, type VNode } from 'vue'
import type { TComponentVariant } from '@soldy-ui/core'
import {
	Button,
	Calendar,
	CheckBox,
	Pagination,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	RadioGroupItem,
	Slider,
	Switch,
	Tabs,
	TabsItem,
} from '@soldy-ui/vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'

import { find, pixel, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const SCHEMES = ['oren', 'oren-dark'] as const

type TScheme = (typeof SCHEMES)[number]

/**
 * Варианты со своим цветом. У Button `normal` — нейтраль, и её заливка
 * `filled` — вуаль «на шаг от поверхности», а не сигнал
 * (`button-neutral-tones` в `themes/oren/src/components/button/_mixins.scss`).
 */
const COLORED = COMPONENT_VARIANTS.filter((variant) => variant !== 'normal')

/** Часть рисунка по селектору — и SVG тоже: дуга кольца не HTML-узел. */
function part(root: Element, selector: string): Element {
	const element = root.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/**
 * Цвет фонового слоя одного цвета — `linear-gradient(<цвет> 0 0)`: так тема
 * рисует отметку текущей страницы Pagination, поверх вуали состояний.
 */
function layerColor(element: Element): string {
	const image = style(element).backgroundImage
	const color = /^linear-gradient\((?<color>.+?) 0px/.exec(image)?.groups?.color

	if (!color) throw new Error(`слой заливки не разобран: ${image}`)

	return color
}

/** Компонент с сигналом: как его нарисовать в варианте и где прочесть цвет сигнала. */
interface ISignal {
	render: (variant: TComponentVariant) => VNode
	color: (root: Element) => string
	/** Куда навести указатель, чтобы сигнал взял ступень наведения; нет — наведения у части нет. */
	hover?: (root: Element) => Element
	/** Варианты, в которых часть — сигнал; нет — во всех. */
	variants?: readonly TComponentVariant[]
}

/** Эталон — включённая дорожка Switch. */
const REFERENCE: ISignal = {
	render: (variant) => h(Switch, { variant, value: true }),
	color: (root) => style(part(root, '.so-switch__track')).backgroundColor,
}

const TABS = ['Первый', 'Второй', 'Третий']

/** Выбранный день календаря — ячейка дня, на которую и наводят указатель. */
const SELECTED_DAY = '.so-calendar-item[data-selected="true"]'

/** Что сверяется с эталоном; доля — не ноль, иначе заливки не видно. */
const SIGNALS: Record<string, ISignal> = {
	'заливка Slider': {
		render: (variant) => h(Slider, { variant, value: 50 }),
		color: (root) => style(part(root, '.so-slider__range')).backgroundColor,
	},
	'заливка доли ProgressLinear': {
		render: (variant) => h(ProgressLinear, { variant, value: 40 }),
		color: (root) => style(part(root, '.so-progress-linear__range')).backgroundColor,
	},
	'дуга ProgressSpinner': {
		render: (variant) => h(ProgressSpinner, { variant, value: 40 }),
		color: (root) => style(part(root, '.so-progress-spinner__range')).stroke,
	},
	'полоса под активным табом': {
		render: (variant) =>
			h(
				Tabs,
				{ variant },
				{
					default: () =>
						TABS.map((text, index) =>
							h(TabsItem, {
								key: text,
								value: String(index),
								text,
								active: index === 0,
							}),
						),
				},
			),
		// Полоса — `::after` списка: своего узла у неё нет
		color: (root) => style(part(root, '.so-tabs__list'), '::after').backgroundColor,
	},
	'заливка Button filled': {
		render: (variant) => h(Button, { variant, text: 'Кнопка' }),
		color: (root) => style(part(root, '.so-button')).backgroundColor,
		hover: (root) => part(root, '.so-button'),
		variants: COLORED,
	},
	// `total` — записей, по десять на страницу: страниц пять, текущая — вторая
	'текущая страница Pagination': {
		render: (variant) =>
			h(Pagination, { variant, aria_label: 'Страницы', total: 50, value: 2 }),
		color: (root) =>
			layerColor(part(root, '.so-pagination-item[data-selected="true"] > .so-button')),
	},
	'отмеченная коробка CheckBox filled': {
		render: (variant) => h(CheckBox, { variant, view: 'filled', value: true }),
		color: (root) => style(part(root, '.so-check-box__container')).backgroundColor,
		// Поле лежит поверх коробки: наведение на флажок — наведение на поле
		hover: (root) => part(root, '.so-check-box'),
	},
	'отметка CheckBox': {
		render: (variant) => h(CheckBox, { variant, value: true }),
		color: (root) => style(part(root, '.so-check-box__container svg')).fill,
	},
	'отметка RadioGroup': {
		render: (variant) =>
			h(RadioGroup, { variant, value: 'a' }, () => [
				h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
			]),
		// Точку и толстое кольцо вид рисует цветом контрола
		color: (root) => style(part(root, '.so-radio-group-item__control')).color,
	},
	'выбранный день Calendar': {
		render: (variant) =>
			h(Calendar, { variant, months: ['2026-09-01'], value: '2026-09-16', timeZone: 'UTC' }),
		color: (root) =>
			style(part(root, `${SELECTED_DAY} > .so-calendar-item__day`)).backgroundColor,
		hover: (root) => part(root, SELECTED_DAY),
	},
}

/** Все компоненты сцены: эталон и сверяемые, каждый в своей ячейке. */
const PLACES: Record<string, ISignal> = { эталон: REFERENCE, ...SIGNALS }

/** Части, у которых в этом варианте сигнал. */
const signalsOf = (variant: TComponentVariant): string[] =>
	Object.entries(SIGNALS)
		.filter(([, signal]) => signal.variants?.includes(variant) ?? true)
		.map(([place]) => place)

/** Сцена: строка на вариант, в строке — компонент на ячейку. */
async function show(scheme: TScheme, variants: readonly TComponentVariant[]): Promise<void> {
	document.documentElement.dataset.soTheme = scheme

	render(
		defineComponent({
			render: () =>
				h('div', [
					h('div', { class: 'so-test-away', style: 'height: 24px' }),
					...variants.map((variant) =>
						h(
							'div',
							{
								key: variant,
								'data-variant': variant,
								style: 'display: flex; flex-direction: column; gap: 8px; width: 320px',
							},
							Object.entries(PLACES).map(([place, signal]) =>
								h('div', { key: place, 'data-place': place }, [
									signal.render(variant),
								]),
							),
						),
					),
				]),
		}),
	)

	await userEvent.hover(find('.so-test-away'))
	await settled(document.body)
}

/** Ячейка части в строке варианта. */
const cellOf = (variant: TComponentVariant, place: string): HTMLElement =>
	find(`[data-variant="${variant}"] [data-place="${place}"]`)

/** Часть сцены по имени ячейки. */
function placeOf(place: string): ISignal {
	const signal = PLACES[place]

	if (!signal) throw new Error(`${place}: такой ячейки нет`)

	return signal
}

/** Цвет сигнала в ячейке — байтами sRGB с прозрачностью. */
const signalOf = (variant: TComponentVariant, place: string): number[] => [
	...pixel([placeOf(place).color(cellOf(variant, place))]),
]

/** Цвет сигнала части под указателем. */
async function hoveredOf(variant: TComponentVariant, place: string): Promise<number[]> {
	const { hover } = placeOf(place)

	if (!hover) throw new Error(`${place}: наведения у части нет`)

	await userEvent.hover(hover(cellOf(variant, place)))
	await settled(document.body)

	return signalOf(variant, place)
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(SCHEMES)('%s: сигнал одного цвета', (scheme) => {
	it('эталоны вариантов разного цвета', async () => {
		await show(scheme, COMPONENT_VARIANTS)

		const references = COMPONENT_VARIANTS.map((variant) => signalOf(variant, 'эталон').join())

		expect(new Set(references).size).toBe(COMPONENT_VARIANTS.length)
	})

	/** Сверка всех частей сразу: отчёт называет каждую, что разошлась, а не первую. */
	it.each(COMPONENT_VARIANTS)('%s: цвета включённой дорожки Switch', async (variant) => {
		await show(scheme, [variant])

		const reference = signalOf(variant, 'эталон')
		const places = signalsOf(variant)

		expect(
			Object.fromEntries(places.map((place) => [place, signalOf(variant, place)])),
		).toEqual(Object.fromEntries(places.map((place) => [place, reference])))
	})

	/**
	 * Наведение — у тех частей, где оно есть. Сверка с первой из них, а цвет
	 * покоя — с эталоном: наведение обязано уйти от покоя.
	 */
	it.each(COMPONENT_VARIANTS)('%s: наведение одного цвета, не цвета покоя', async (variant) => {
		await show(scheme, [variant])

		const places = signalsOf(variant).filter((place) => placeOf(place).hover)
		const hovered: Record<string, number[]> = {}

		for (const place of places) hovered[place] = await hoveredOf(variant, place)

		const [first] = Object.values(hovered)

		expect(places.length).toBeGreaterThan(1)
		expect(hovered).toEqual(Object.fromEntries(places.map((place) => [place, first])))
		expect(first).not.toEqual(signalOf(variant, 'эталон'))
	})
})
