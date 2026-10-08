/**
 * Цвет пилюли тега в настоящем браузере: тег без своего варианта — цвета
 * варианта набора, свой вариант тега — поверх набора.
 *
 * Вариант набора тегу не доставляется (`core/__tests__/collection-style-inherit.spec.ts`):
 * тема красит им тег по классу набора (`s-tags--variant-<v>`), а свой
 * модификатор тега (`s-tags-item--variant-<v>`) сильнее. Переменные цвета
 * стоят на самом теге (`button-tones`), а правило набора достаёт до тега на
 * любой глубине: в `wrap` и `scroll` тег — ребёнок набора, а своя раскладка в
 * слоте `default` ставит его глубже, в свою обёртку. Свой `normal` у тега —
 * нейтраль и в цветном наборе: без модификатора тег взял бы вариант набора.
 *
 * Цветов темы спек не знает: пилюля `filled` сверяется фоном и текстом с
 * эталонной кнопкой — без вида, того варианта, который тег обязан показать.
 * В jsdom вычисленных стилей темы нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import type { ITagsItem } from '@soldy-ui/core'
import { Button, Tags, TagsItem } from '@soldy-ui/vue'

import { find, settled, style } from './colors'

import '@soldy-ui/theme-oren'

/** Варианты, которые показывают теги спека; `undefined` — без варианта. */
const VARIANTS = [undefined, 'normal', 'accent', 'negative'] as const

type TVariant = (typeof VARIANTS)[number]

/** Теги набора: свой вариант — у «Тверь» (`normal`) и у «Пермь» (`negative`). */
const TAGS: ReadonlyArray<{ text: string; variant?: TVariant }> = [
	{ text: 'Москва' },
	{ text: 'Тверь', variant: 'normal' },
	{ text: 'Казань' },
	{ text: 'Пермь', variant: 'negative' },
	{ text: 'Самара' },
]

/** Класс эталонной кнопки варианта. */
const referenceOf = (variant: TVariant) => `s-test-reference-${variant ?? 'none'}`

/**
 * Своя раскладка в слоте `default`: теги не прямыми детьми набора, а в своей
 * обёртке — так их ставит лента или ряд с хвостом в панели.
 */
const ownRow = ({ shown }: { shown: ITagsItem[] }) =>
	h(
		'div',
		{ class: 's-test-own', style: 'display: flex; gap: 4px' },
		shown.map((item) => h(TagsItem, { key: item.uid, ctrl: item })),
	)

/**
 * Эталоны — кнопки без вида, то есть `filled`, как пилюля набора без вида,
 * по одной на вариант; рядом — узел, на который уходит указатель, чтобы
 * наведение не перекрасило пилюлю.
 */
const harness = (
	width: number,
	tags: Record<string, unknown>,
	slots: { default?: typeof ownRow } = {},
) =>
	defineComponent({
		render() {
			return h('div', [
				h('div', { class: 's-test-away', style: 'height: 24px' }),
				h(
					'div',
					VARIANTS.map((variant) =>
						h(Button, { text: 'Эталон', variant, class: referenceOf(variant) }),
					),
				),
				h('div', { style: `width: ${width}px` }, [
					h(
						Tags,
						{
							items: TAGS.map(({ text, variant }) => ({
								value: text,
								text,
								variant,
							})),
							...tags,
						},
						slots,
					),
				]),
			])
		},
	})

/** Цвет поверхности: фон и текст. */
const colorsOf = (element: Element) => {
	const { backgroundColor, color } = style(element)

	return { backgroundColor, color }
}

/** Свой вариант тега по тексту его строки. */
const ownOf = (item: Element): TVariant => {
	const text = item.textContent?.trim()
	const tag = TAGS.find((candidate) => candidate.text === text)

	if (!tag) throw new Error(`тега «${text}» в наборе нет`)

	return tag.variant
}

/** Каждый тег документа — цвета кнопки своего варианта, а без своего — варианта набора. */
const expectTagsLikeReferences = async (set: TVariant) => {
	await userEvent.hover(find('.s-test-away'))

	const items = [...document.querySelectorAll('.s-tags-item')]

	expect(items).toHaveLength(TAGS.length)

	for (const item of items) {
		await settled(item)

		const reference = find(`.${referenceOf(ownOf(item) ?? set)}`)

		expect(colorsOf(item), item.textContent?.trim()).toEqual(colorsOf(reference))
	}
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

/** Эталоны различимы — иначе сверка с ними прошла бы на любом цвете. */
it('эталонные кнопки вариантов разного цвета', () => {
	render(harness(640, {}))

	const fills = [undefined, 'accent', 'negative'].map(
		(variant) => style(find(`.s-test-reference-${variant ?? 'none'}`)).backgroundColor,
	)

	expect(new Set(fills).size).toBe(fills.length)
	// `normal` — нейтраль: кнопка без варианта и с ним одного цвета
	expect(colorsOf(find(`.${referenceOf('normal')}`))).toEqual(
		colorsOf(find(`.${referenceOf(undefined)}`)),
	)
})

describe.each(['wrap', 'scroll'] as const)('ряд %s', (overflow) => {
	it('набор accent: тег без своего варианта — accent, свой вариант — поверх', async () => {
		render(harness(overflow === 'scroll' ? 240 : 640, { overflow, variant: 'accent' }))

		await expectTagsLikeReferences('accent')
	})

	it('набор без варианта: тег без своего — нейтраль, свой вариант — свой', async () => {
		render(harness(overflow === 'scroll' ? 240 : 640, { overflow }))

		await expectTagsLikeReferences(undefined)
	})
})

/**
 * Своя раскладка в слоте `default` ставит теги в свою обёртку, и правило
 * «тег — ребёнок набора» до них не доставало бы: набор красит тег-потомок на
 * любой глубине. Иначе ленту или ряд с панелью пришлось бы сопровождать
 * своей копией матрицы видов.
 */
describe('своя раскладка в слоте', () => {
	it('теги в своей обёртке — тех же цветов, что прямо в наборе', async () => {
		render(harness(640, { variant: 'accent' }, { default: ownRow }))

		const own = [...find('.s-test-own').children]

		// Теги — в обёртке, а не детьми набора: иначе сверка ниже пуста
		expect(own).toHaveLength(TAGS.length)
		expect(own.every((item) => item.classList.contains('s-tags-item'))).toBe(true)

		await expectTagsLikeReferences('accent')
	})
})
