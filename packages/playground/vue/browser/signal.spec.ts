/**
 * Сигнал — насыщенная заливка, которая говорит «включено», «вот сколько» и
 * «вот этот», — одного цвета у всех компонентов одного варианта: включённая
 * дорожка Switch, заливка Slider, заливка доли ProgressLinear, дуга
 * ProgressSpinner и полоса под активным табом `line`. Рядом в форме они не
 * спорят: синий переключателя и синяя полоса загрузки — один синий
 * (`themes/oren/AGENTS.md`, «Тесты»). Раньше индикаторы и полоса таба стояли
 * своей ступенью, на шаг дальше от поверхности, чем переключатель.
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
import { ProgressLinear, ProgressSpinner, Slider, Switch, Tabs, TabsItem } from '@soldy-ui/vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'

import { find, pixel, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const SCHEMES = ['oren', 'oren-dark'] as const

type TScheme = (typeof SCHEMES)[number]

/** Часть рисунка по селектору — и SVG тоже: дуга кольца не HTML-узел. */
function part(root: Element, selector: string): Element {
	const element = root.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/** Компонент с сигналом: как его нарисовать в варианте и где прочесть цвет сигнала. */
interface ISignal {
	render: (variant: TComponentVariant) => VNode
	color: (root: Element) => string
}

/** Эталон — включённая дорожка Switch. */
const REFERENCE: ISignal = {
	render: (variant) => h(Switch, { variant, value: true }),
	color: (root) => style(part(root, '.so-switch__track')).backgroundColor,
}

const TABS = ['Первый', 'Второй', 'Третий']

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
}

/** Все компоненты сцены: эталон и сверяемые, каждый в своей ячейке. */
const PLACES: Record<string, ISignal> = { эталон: REFERENCE, ...SIGNALS }

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

/** Цвет сигнала в ячейке — байтами sRGB с прозрачностью. */
function signalOf(variant: TComponentVariant, place: string): number[] {
	const signal = PLACES[place]

	if (!signal) throw new Error(`${place}: такой ячейки нет`)

	const cell = find(`[data-variant="${variant}"] [data-place="${place}"]`)

	return [...pixel([signal.color(cell)])]
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
		const places = Object.keys(SIGNALS)

		expect(
			Object.fromEntries(places.map((place) => [place, signalOf(variant, place)])),
		).toEqual(Object.fromEntries(places.map((place) => [place, reference])))
	})
})
