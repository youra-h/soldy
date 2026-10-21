/**
 * Сигнал — насыщенная заливка, которая говорит «включено», «вот сколько» и
 * «вот этот», — одного цвета у всех компонентов одного варианта: включённая
 * дорожка Switch, заливка Slider, заливка доли ProgressLinear, дуга
 * ProgressSpinner, полоса под активным табом `line`, заливка Button `filled`,
 * текущая страница Pagination, выбранный день Calendar, отмеченная коробка
 * CheckBox `filled`, отметки CheckBox и радио и плашка тоста с видом. Рядом в
 * форме они не спорят: синий переключателя и синяя полоса загрузки — один
 * синий (`themes/oren/AGENTS.md`, «Три роли цвета»). Раньше индикаторы и
 * полоса таба стояли своей ступенью, на шаг дальше от поверхности, чем
 * переключатель, а плашка тоста в светлой схеме была почти чёрной.
 *
 * Палитры спек не знает: эталон — включённая дорожка Switch того же варианта,
 * и с ней сверяются остальные. Сверка — байтами sRGB (`pixel`): запись цвета
 * у браузера сравнивать нельзя. Читается нарисованное, а не переменная темы:
 * у радио — фон точки, у текущей страницы — слой её фона. Эталоны вариантов
 * различимы — иначе сверка прошла бы на любом цвете. Варианты — все, что
 * объявляет тема, `normal` тоже: у индикаторов он — нейтраль, а не база, а
 * нейтральное значение — страница, день, коробка, отметки — тоже сигнал, а не
 * вуаль. Без `normal` — два места: нейтральный `filled` у Button — вуаль, а не
 * сигнал (AGENTS.md темы, «Нейтраль — два смысла»), а плашка тоста без вида —
 * белая. Вид тоста сверяется с вариантом своего семейства. Звёзд Rating здесь
 * нет: без варианта они золотые — исключение владельца. Обе схемы: середина
 * хроматических шкал в них своя. В jsdom цвета не вычисляются вовсе.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, type PropType, type VNode } from 'vue'
import type { TComponentVariant, TToastsItemType } from '@soldy-ui/core'
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
	Toasts,
	useToasts,
} from '@soldy-ui/vue'
import { COMPONENT_VARIANTS, TOASTS_ITEM_TYPES } from '@soldy-ui/playground-shared'

import { find, gradientColor, pixel, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const SCHEMES = ['oren', 'oren-dark'] as const

type TScheme = (typeof SCHEMES)[number]

/** Варианты со своим цветом: `normal` — нейтраль. */
const COLORED = COMPONENT_VARIANTS.filter((variant) => variant !== 'normal')

/**
 * Вид тоста — семейство его заливки (`toasts/_toasts.scss`). Карта — по всем
 * видам ядра: новый вид без семейства не соберётся, а не выпадет из сверки.
 */
const TOAST_FAMILIES: Record<TToastsItemType, TComponentVariant> = {
	info: 'accent',
	success: 'positive',
	warning: 'caution',
	error: 'negative',
}

/** Вид тоста, залитый семейством варианта. */
function toastType(variant: TComponentVariant): TToastsItemType {
	const found = TOASTS_ITEM_TYPES.find((type) => TOAST_FAMILIES[type] === variant)

	if (!found) throw new Error(`${variant}: вида тоста этого цвета нет`)

	return found
}

/** Приложение под менеджером тостов: показывает тост вида `type` из кода, как приложение. */
const ShowToast = defineComponent({
	props: {
		type: { type: String as PropType<TToastsItemType>, required: true },
	},
	setup(props) {
		useToasts().show({ text: 'Сообщение', type: props.type })

		return () => h('p', 'Приложение')
	},
})

/** Часть рисунка по селектору — и SVG тоже: дуга кольца не HTML-узел. */
function part(root: Element, selector: string): Element {
	const element = root.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/**
 * Компонент с сигналом: в каких вариантах сигнал у него есть, как нарисовать
 * компонент в варианте и где прочесть цвет сигнала — в ячейке, где компонент
 * нарисован, или по варианту, если рисунок ушёл из ячейки.
 */
interface ISignal {
	variants: readonly TComponentVariant[]
	render: (variant: TComponentVariant) => VNode
	color: (cell: Element, variant: TComponentVariant) => string
}

/** Эталон — включённая дорожка Switch. */
const REFERENCE: ISignal = {
	variants: COMPONENT_VARIANTS,
	render: (variant) => h(Switch, { variant, value: true }),
	color: (cell) => style(part(cell, '.so-switch__track')).backgroundColor,
}

const TABS = ['Первый', 'Второй', 'Третий']

/** Что сверяется с эталоном; доля — не ноль, иначе заливки не видно. */
const SIGNALS: Record<string, ISignal> = {
	'заливка Slider': {
		variants: COMPONENT_VARIANTS,
		render: (variant) => h(Slider, { variant, value: 50 }),
		color: (cell) => style(part(cell, '.so-slider__range')).backgroundColor,
	},
	'заливка доли ProgressLinear': {
		variants: COMPONENT_VARIANTS,
		render: (variant) => h(ProgressLinear, { variant, value: 40 }),
		color: (cell) => style(part(cell, '.so-progress-linear__range')).backgroundColor,
	},
	'дуга ProgressSpinner': {
		variants: COMPONENT_VARIANTS,
		render: (variant) => h(ProgressSpinner, { variant, value: 40 }),
		color: (cell) => style(part(cell, '.so-progress-spinner__range')).stroke,
	},
	'полоса под активным табом': {
		variants: COMPONENT_VARIANTS,
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
		color: (cell) => style(part(cell, '.so-tabs__list'), '::after').backgroundColor,
	},
	'заливка Button filled': {
		variants: COLORED,
		render: (variant) => h(Button, { variant, view: 'filled', text: 'Кнопка' }),
		color: (cell) => style(part(cell, '.so-button')).backgroundColor,
	},
	'текущая страница Pagination': {
		variants: COMPONENT_VARIANTS,
		render: (variant) =>
			h(Pagination, { variant, total: 100, value: 5, aria_label: 'Страницы' }),
		// Заливка — слой фона поверх вуали `plain`, а не цвет фона
		color: (cell) =>
			gradientColor(part(cell, ".so-pagination-item[data-selected='true'] > .so-button")),
	},
	'выбранный день Calendar': {
		variants: COMPONENT_VARIANTS,
		render: (variant) => h(Calendar, { variant, months: ['2026-09-01'], value: '2026-09-16' }),
		color: (cell) =>
			style(part(cell, ".so-calendar-item[data-selected='true'] > .so-calendar-item__day"))
				.backgroundColor,
	},
	'отмеченная коробка CheckBox filled': {
		variants: COMPONENT_VARIANTS,
		render: (variant) => h(CheckBox, { variant, view: 'filled', value: true }),
		color: (cell) => style(part(cell, '.so-check-box__container')).backgroundColor,
	},
	'отметка CheckBox': {
		variants: COMPONENT_VARIANTS,
		render: (variant) => h(CheckBox, { variant, value: true }),
		color: (cell) => style(part(cell, '.so-check-box__container svg')).fill,
	},
	'отметка радио': {
		variants: COMPONENT_VARIANTS,
		render: (variant) =>
			h(RadioGroup, { variant, value: 'a' }, () => [
				h(RadioGroupItem, { value: 'a' }, () => 'Первый'),
				h(RadioGroupItem, { value: 'b' }, () => 'Второй'),
			]),
		color: (cell) =>
			style(
				part(
					cell,
					".so-radio-group-item[data-selected='true'] .so-radio-group-item__indicator",
				),
			).backgroundColor,
	},
	'плашка тоста с видом': {
		variants: TOASTS_ITEM_TYPES.map((type) => TOAST_FAMILIES[type]),
		render: (variant) =>
			h(Toasts, { duration: 0 }, () => h(ShowToast, { type: toastType(variant) })),
		// Регион тостов телепортирован в `body`, мимо ячейки: плашка — по виду
		color: (_cell, variant) =>
			style(find(`.so-toasts-item--type-${toastType(variant)} > .so-toasts-item__card`))
				.backgroundColor,
	},
}

/** Все компоненты сцены: эталон и сверяемые, каждый в своей ячейке. */
const PLACES: Record<string, ISignal> = { эталон: REFERENCE, ...SIGNALS }

/** Места, у которых сигнал в варианте есть, — с именами. */
const placesOf = (
	places: Record<string, ISignal>,
	variant: TComponentVariant,
): [string, ISignal][] =>
	Object.entries(places).filter(([, signal]) => signal.variants.includes(variant))

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
							placesOf(PLACES, variant).map(([place, signal]) =>
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

/** Цвет сигнала места в варианте — байтами sRGB с прозрачностью. */
function signalOf(variant: TComponentVariant, place: string): number[] {
	const signal = PLACES[place]

	if (!signal) throw new Error(`${place}: такой ячейки нет`)

	const cell = find(`[data-variant="${variant}"] [data-place="${place}"]`)

	return [...pixel([signal.color(cell, variant)])]
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

	/** Сверка всех мест варианта сразу: отчёт называет каждое, что разошлось, а не первое. */
	it.each(COMPONENT_VARIANTS)('%s: цвета включённой дорожки Switch', async (variant) => {
		await show(scheme, [variant])

		const reference = signalOf(variant, 'эталон')
		const places = placesOf(SIGNALS, variant).map(([place]) => place)

		expect(
			Object.fromEntries(places.map((place) => [place, signalOf(variant, place)])),
		).toEqual(Object.fromEntries(places.map((place) => [place, reference])))
	})
})
