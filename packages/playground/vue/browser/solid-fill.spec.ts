/**
 * Белое на насыщенной заливке темы — в настоящем браузере, в обеих схемах.
 *
 * Белым по цвету тема пишет подпись `filled` с вариантом у Button и у пилюли
 * тега, номер текущей страницы Pagination, номер выбранного дня Calendar и
 * отметку коробки CheckBox `filled`; значок крестика на пилюле — цвета её
 * подписи. Заливка у них одна — заливка под белым текстом, а состояния — её
 * тень (`themes/oren/src/mixins/_solid.scss`). Раньше заливка стояла на
 * середине шкалы, и белый на ней в светлой схеме держал от 2,15:1, а состояния
 * брали ступени «+100», которые в тёмной схеме светлели к белому — до 2,17:1
 * при нажатии. Светлая ручка Switch стоит на включённой дорожке — тоже
 * насыщенной заливке, но своей (`--so-component-knob-track-*`): ручке хватает
 * 3:1, и в светлой схеме дорожка на ступень светлее заливки под текстом.
 *
 * Здесь: подпись держит 4,5:1 (WCAG 1.4.3), значок, отметка и ручка — 3:1
 * (1.4.11) — в покое и в каждом состоянии, а состояние видно и уводит фон от
 * подписи, а не к ней. Сторож токенов (`themes/oren/__tests__/tokens.spec.ts`) держит
 * только покой, и только по числам токенов; состояния и то, что заливку в
 * каждом месте берут из токена, видно лишь здесь.
 *
 * Палитры спек не знает: контраст и светлота считаются слоями, как их кладёт
 * браузер (`./colors`), а сторону подписи даёт сама подпись.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick } from 'vue'
import type { VNode } from 'vue'
import { Button, Calendar, CheckBox, Pagination, Switch, Tags, TagsItem } from '@soldy-ui/vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'

import { contrast, find, lightness, settled, style } from './colors'

import '@soldy-ui/theme-oren'

const SCHEMES = ['oren', 'oren-dark'] as const

/** Варианты со своим цветом: `normal` — та же нейтраль, что и без варианта. */
const COLORED = COMPONENT_VARIANTS.filter((variant) => variant !== 'normal')

/**
 * Нейтраль — блок без варианта — и каждый вариант. Нейтраль насыщенной бывает
 * не у всех: у Button и тега без варианта заливка — вуаль с тёмной подписью.
 */
const COLORS = [
	{ name: 'нейтраль', variant: undefined },
	...COLORED.map((variant) => ({ name: variant, variant })),
]

/**
 * Пороги WCAG 2: подпись кегля `text-sm` — 4,5:1 (1.4.3), значок, отметка и
 * ручка — 3:1 (1.4.11).
 */
const TEXT = 4.5
const GRAPHIC = 3

/**
 * Состояние видно, если фон отошёл от покоя по светлоте OKLab не меньше, чем
 * вуаль-заливка от подложки, — порог `VISIBLE_FILL` из `button-view.spec.ts`.
 */
const VISIBLE_FILL = 0.02

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Случай «схема × цвет». */
const casesOf = <T extends { name: string }>(colors: readonly T[]) =>
	SCHEMES.flatMap((scheme) => colors.map((color) => ({ scheme, ...color })))

/** Что видно у части: контраст подписи к фону, светлота фона и сторона подписи. */
type TLook = { label: number; fill: number; toward: number }

/** Подпись `color` на фоне `fill` — непрозрачной заливке. */
const look = (color: string, fill: string): TLook => ({
	label: contrast(color, [fill]),
	fill: lightness([fill]),
	toward: Math.sign(lightness([color]) - lightness([fill])),
})

/** Насколько фон состояния ушёл от покоя в сторону от подписи: плюс — от неё. */
const away = (state: TLook, rest: TLook): number => (rest.fill - state.fill) * rest.toward

/**
 * Сцена над местом, куда уводится указатель: наведение красит часть, и покой
 * меряется без него. Узлы плагины получают кадром позже, дни календаря — ещё
 * позже владельца.
 */
async function show(scheme: (typeof SCHEMES)[number], content: () => VNode[]): Promise<void> {
	document.documentElement.dataset.soTheme = scheme
	render(
		defineComponent({
			render: () =>
				h('div', [
					h('div', { class: 'so-test-away', style: 'height: 24px' }),
					...content(),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
	await rest()
}

/** Указатель уведён с частей, переходы цвета доиграли. */
async function rest(): Promise<void> {
	await userEvent.hover(find('.so-test-away'))
	await settled(document.body)
}

/** Наведение на узел — когда доиграли переходы цвета. */
async function hover(element: Element): Promise<void> {
	await userEvent.hover(element)
	await settled(document.body)
}

/**
 * Нажатие на узел под указателем: что видно, пока кнопка мыши зажата. Нажатие
 * отпускается и при упавшей проверке — зажатая кнопка досталась бы следующему
 * тесту.
 */
async function pressed<T>(read: () => T): Promise<T> {
	await commands.mouseDown()

	try {
		await settled(document.body)

		return read()
	} finally {
		await commands.mouseUp()
	}
}

/** Состояния читаются, видны и уводят фон от подписи, а не к ней. */
function expectStates(looks: Record<string, TLook>, rest: TLook, label: number): void {
	expect(rest.label, 'покой').toBeGreaterThanOrEqual(label)

	for (const [state, seen] of Object.entries(looks)) {
		expect(seen.label, state).toBeGreaterThanOrEqual(label)
		expect(
			away(seen, rest),
			`${state}: фон ушёл от покоя в сторону от подписи`,
		).toBeGreaterThanOrEqual(VISIBLE_FILL)
	}
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

/**
 * Выбор у Button — «нажато» у кнопки, открывшей панель, выбранный тег, —
 * подсветка с клавиатуры — строка списка под стрелками. Выбор под подсветкой
 * — два состояния сразу и уходит от подписи дальше выбора.
 */
describe('Button filled с вариантом', () => {
	it.each(casesOf(COLORS.filter(({ variant }) => variant)))(
		'$scheme, $name: подпись читается в покое и в каждом состоянии, а состояние видно',
		async ({ scheme, variant }) => {
			const both = { 'data-selected': 'true', 'data-highlighted': 'true' }

			await show(scheme, () => [
				h(Button, { text: 'Покой', variant, class: 'so-test-rest' }),
				h(Button, {
					text: 'Выбор',
					variant,
					class: 'so-test-selected',
					'data-selected': 'true',
				}),
				h(Button, { text: 'Оба', variant, class: 'so-test-both', ...both }),
			])

			const of = (selector: string) => {
				const { color, backgroundColor } = style(find(selector))

				return look(color, backgroundColor)
			}

			const resting = of('.so-test-rest')
			const selected = of('.so-test-selected')
			const highlighted = of('.so-test-both')

			await hover(find('.so-test-rest'))

			const hovered = of('.so-test-rest')
			const active = await pressed(() => of('.so-test-rest'))

			expectStates(
				{
					наведение: hovered,
					нажатие: active,
					выбор: selected,
					'выбор под подсветкой': highlighted,
				},
				resting,
				TEXT,
			)
			expect(
				away(highlighted, selected),
				'выбор под подсветкой дальше выбора',
			).toBeGreaterThanOrEqual(VISIBLE_FILL)
		},
	)
})

/**
 * Пилюля тега рисуется видом Button (`tags/_tags.scss`), а крестик — сосед её
 * строки со своим видом `plain`: его значок — цвета подписи пилюли, и на
 * насыщенной заливке он белый. Тёмным значком нейтрали на заливке светлой
 * схемы он держал бы меньше 3:1.
 */
describe('пилюля тега filled с вариантом', () => {
	it.each(casesOf(COLORS.filter(({ variant }) => variant)))(
		'$scheme, $name: подпись и крестик читаются в покое и под наведением на крестик',
		async ({ scheme, variant }) => {
			await show(scheme, () => [
				h(Tags, { variant }, () => [
					h(TagsItem, { key: 'a', value: 'a', text: 'Тег', closable: true }),
				]),
			])

			const item = find('.so-tags-item')
			const close = find('.so-tags-item__close')

			const of = () => {
				const pill = style(item).backgroundColor
				const backdrop = [pill, style(close).backgroundColor]

				return {
					label: look(style(item).color, pill),
					close: contrast(style(close).color, backdrop),
				}
			}

			const resting = of()

			await hover(close)

			const hovered = of()

			expectStates({ наведение: hovered.label }, resting.label, TEXT)
			expect(resting.close, 'крестик, покой').toBeGreaterThanOrEqual(GRAPHIC)
			expect(hovered.close, 'крестик, наведение').toBeGreaterThanOrEqual(GRAPHIC)
		},
	)
})

/**
 * Заливку текущей страницы Pagination рисует фоновый слой одного цвета поверх
 * вуали строки (`pagination/_pagination.scss`): переход строки его не ведёт,
 * и отметка не мигает при сдвиге окна. Наведения и нажатия у текущей нет.
 * Нейтраль у неё насыщенная, как у дня Calendar.
 */
describe('текущая страница Pagination', () => {
	/** Цвет слоя одного цвета — `linear-gradient(<цвет> 0 0)`; нет его — тест падает здесь. */
	const layerOf = (element: Element): string => {
		const image = style(element).backgroundImage
		const color = image.match(/^linear-gradient\((.+?\)) 0px/)?.[1]

		if (!color) throw new Error(`слоя одного цвета нет: ${image}`)

		return color
	}

	it.each(casesOf(COLORS))('$scheme, $name: номер читается', async ({ scheme, variant }) => {
		await show(scheme, () => [
			h(Pagination, { aria_label: 'Страницы', total: 100, value: 5, variant }),
		])

		const current = find('.so-pagination-item[data-selected="true"] > .so-button')

		expect(look(style(current).color, layerOf(current)).label).toBeGreaterThanOrEqual(TEXT)
	})
})

/** Выбранный день Calendar — номер на заливке, под указателем и при нажатии. */
describe('выбранный день Calendar', () => {
	it.each(casesOf(COLORS))(
		'$scheme, $name: номер читается в покое, под наведением и при нажатии, а состояние видно',
		async ({ scheme, variant }) => {
			await show(scheme, () => [
				h(Calendar, { months: ['2026-09-01'], value: '2026-09-16', variant }),
			])

			const cell = find('.so-calendar-item[data-selected="true"]')
			const day = find('.so-calendar-item__day', cell)

			const of = () => look(style(day).color, style(day).backgroundColor)

			const resting = of()

			await hover(cell)

			const hovered = of()
			const active = await pressed(of)

			expectStates({ наведение: hovered, нажатие: active }, resting, TEXT)
		},
	)
})

/**
 * Отметка коробки CheckBox `filled` — графика: белая галка на заливке.
 * Наведение у отмеченной коробки — её тень; наводится указатель на поле
 * поверх коробки, как у пользователя.
 */
describe('отмеченная коробка CheckBox filled', () => {
	it.each(casesOf(COLORS))(
		'$scheme, $name: отметка видна в покое и под наведением, а наведение видно',
		async ({ scheme, variant }) => {
			await show(scheme, () => [h(CheckBox, { value: true, view: 'filled', variant })])

			const box = find('.so-check-box__container')
			const mark = box.querySelector('svg')

			if (!mark) throw new Error('отметки нет')

			const of = () => look(style(mark).fill, style(box).backgroundColor)

			const resting = of()

			await hover(find('.so-check-box input'))

			expectStates({ наведение: of() }, resting, GRAPHIC)
		},
	)
})

/**
 * Ручка Switch на включённой дорожке — графика: светлая ручка
 * (`--so-component-knob`) на насыщенной заливке под ней
 * (`--so-component-knob-track-*`). На середине шкалы, где дорожка стояла
 * раньше, белая ручка в светлой схеме держала от 2,13:1, а на цвете графики
 * тёмной схемы светлая ручка держала бы от 2,40:1. Наведения у включённой
 * дорожки нет, поэтому только покой.
 */
describe('ручка на включённой дорожке Switch', () => {
	it.each(casesOf(COLORS))(
		'$scheme, $name: ручка видна на дорожке',
		async ({ scheme, variant }) => {
			await show(scheme, () => [h(Switch, { value: true, variant })])

			const track = find('.so-switch__track')
			const knob = find('.so-switch__track--thumb', track)

			expect(
				contrast(style(knob).backgroundColor, [style(track).backgroundColor]),
			).toBeGreaterThanOrEqual(GRAPHIC)
		},
	)
})
