/**
 * Цвет пилюли тега в настоящем браузере: тег без своего варианта — цвета
 * варианта набора, свой вариант тега — поверх набора.
 *
 * Вариант набора тегу не доставляется (`core/__tests__/collection-style-inherit.spec.ts`):
 * тема красит им тег по классу набора (`s-tags--variant-<v>`), а свой
 * модификатор тега (`s-tags-item--variant-<v>`) сильнее. Переменные цвета
 * стоят на самом теге (`button-tones`), и путь от набора до тега у правила
 * свой в каждом режиме ряда: в `wrap` тег — ребёнок набора, в `arrows` —
 * вьюпорта ленты, а в `popover` уехавший тег лежит в панели, вне корня набора.
 * Свой `normal` у тега — нейтраль и в цветном наборе: без модификатора тег
 * взял бы вариант набора.
 *
 * Цветов темы спек не знает: пилюля `filled` сверяется фоном и текстом с
 * эталонной кнопкой — без вида, того варианта, который тег обязан показать.
 * В jsdom вычисленных стилей темы нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Button, Tags } from '@soldy-ui/vue'

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
 * Эталоны — кнопки без вида, то есть `filled`, как пилюля набора без вида,
 * по одной на вариант; рядом — узел, на который уходит указатель, чтобы
 * наведение не перекрасило пилюлю.
 */
const harness = (width: number, tags: Record<string, unknown>) =>
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
					h(Tags, {
						items: TAGS.map(({ text, variant }) => ({ value: text, text, variant })),
						...tags,
					}),
				]),
			])
		},
	})

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

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

/**
 * Каждый тег документа — в ряду и в панели — цвета кнопки своего варианта, а
 * без своего — варианта набора.
 */
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

describe.each(['wrap', 'arrows'] as const)('ряд %s', (overflow) => {
	it('набор accent: тег без своего варианта — accent, свой вариант — поверх', async () => {
		render(harness(overflow === 'arrows' ? 240 : 640, { overflow, variant: 'accent' }))

		await expectTagsLikeReferences('accent')
	})

	it('набор без варианта: тег без своего — нейтраль, свой вариант — свой', async () => {
		render(harness(overflow === 'arrows' ? 240 : 640, { overflow }))

		await expectTagsLikeReferences(undefined)
	})
})

describe('ряд popover', () => {
	/**
	 * Панель телепортирована, и селектор набора до её тегов не доходит: на
	 * панели свои классы ряда (`TTags.panelClasses`), по ним тема и красит
	 * уехавшие теги.
	 */
	it('теги в панели — тех же цветов, что в ряду', async () => {
		render(harness(180, { overflow: 'popover', variant: 'accent' }))

		await expect.poll(() => document.querySelector('.s-tags__more')).not.toBeNull()
		await userEvent.click(find('.s-tags__more'))
		await expect.poll(() => document.querySelector('.s-tags__panel')).not.toBeNull()
		await nextFrame()

		const inPanel = [...find('.s-tags__panel').querySelectorAll('.s-tags-item')]

		// В панели есть оба случая: тег без своего варианта и со своим
		expect(inPanel.some((item) => ownOf(item) === undefined)).toBe(true)
		expect(inPanel.some((item) => ownOf(item) !== undefined)).toBe(true)

		await expectTagsLikeReferences('accent')
	})
})
