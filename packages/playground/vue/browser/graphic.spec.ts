/**
 * Цветная графика темы на поверхности — в настоящем браузере, в обеих схемах.
 *
 * Цвет семейства, который стоит на самой поверхности, а не под белым, —
 * отметка CheckBox `outlined` и `plain`, точка и толстое кольцо выбранного
 * радио, заливка Slider, заливка ProgressLinear и дуга ProgressSpinner, полоса
 * под активным табом, — тема берёт из `--so-component-graphic-*`
 * (`themes/oren/src/tokens.css`). Графике нужно 3:1 (WCAG 1.4.11) ко всему,
 * что с ней рядом: к странице и поверхности контрола, на которых компонент
 * стоит, к своей коробке и кольцу, к рельсу Slider — и под наведением — и к
 * дорожке индикатора. Раньше отметки и заливка Slider стояли на середине шкалы
 * (500), индикаторы и полоса — на ступени 600, и в светлой схеме до 3:1 не
 * дотягивали.
 *
 * Сторож токенов (`themes/oren/__tests__/tokens.spec.ts`) держит только пары
 * с самими поверхностями и только по числам токенов. Вуаль поверх них — рельс
 * и дорожки — и то, что каждое место берёт цвет из токена, видно лишь здесь.
 *
 * Пар у звёзд Rating нет: их заливка — записанное исключение по решению
 * владельца о виде звёзд (`themes/oren/AGENTS.md`, «Что тестом не
 * проверяется», «звёзды Rating»).
 *
 * Палитры спек не знает: контраст считается слоями, как их кладёт браузер
 * (`contrast` в `./colors`).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import type { TComponentVariant } from '@soldy-ui/core'
import {
	CheckBox,
	ProgressLinear,
	ProgressSpinner,
	RadioGroup,
	RadioGroupItem,
	Slider,
	Tabs,
	TabsItem,
} from '@soldy-ui/vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'

import { contrast, find, settled, style } from './colors'

import '@soldy-ui/theme-oren'

/** Обе схемы: ступень графики у них разная, а правило одно. */
const SCHEMES = ['oren', 'oren-dark'] as const

type TScheme = (typeof SCHEMES)[number]

/**
 * Подложки, на которых стоит компонент: страница и поверхность контрола —
 * панели Select и Popover, карточка. Цвет — из токенов, поэтому в каждой схеме
 * свой, а сторож один.
 */
const BACKDROPS = {
	страница: 'var(--so-neutral-50)',
	'поверхность контрола': 'var(--so-component-surface)',
} as const

type TBackdrop = keyof typeof BACKDROPS

/**
 * Без варианта и каждый вариант темы. Без варианта — нейтраль, у индикаторов
 * выполнения — `accent`, и нейтраль у них — `normal`.
 */
const VARIANTS: readonly (TComponentVariant | undefined)[] = [undefined, ...COMPONENT_VARIANTS]

/** Порог WCAG 2 для графики (1.4.11). */
const GRAPHIC = 3

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Пара «графика — сосед»: цвет графики и слои соседа снизу вверх, первым —
 * подложка, на которой стоит компонент.
 */
type TPair = { name: string; color: string; under: string[] }

interface IGraphic {
	name: string
	/** Компонент случая — с вариантом или без. */
	render: (variant?: TComponentVariant) => VNode
	/** Пары в покое: `root` — узел случая, `backdrop` — цвет его подложки. */
	pairs: (root: HTMLElement, backdrop: string) => TPair[]
	/** Пары под наведением — если наведение меняет соседа графики. */
	hovered?: {
		/** На что навести указатель. */
		target: (root: HTMLElement) => HTMLElement
		/** Сосед, который наведение обязано изменить, — иначе проверка пуста. */
		changes: (root: HTMLElement) => string
		pairs: (root: HTMLElement, backdrop: string) => TPair[]
	}
}

/** Часть по селектору — и SVG тоже; нет её — тест падает здесь, а не на чтении свойства. */
function part(root: Element, selector: string): Element {
	const element = root.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/** Заливка Slider и рельс под ней — псевдоэлемент дорожки, своего узла у него нет. */
const sliderColors = (root: HTMLElement) => ({
	fill: style(part(root, '.so-slider__range')).backgroundColor,
	rail: style(part(root, '.so-slider__track'), '::before').backgroundColor,
})

/** Пары заливки ползунка или индикатора: к соседу вдоль оси и к подложке. */
const fillPairs = (
	fill: string,
	neighbour: { name: string; color: string },
	backdrop: string,
): TPair[] => [
	{ name: `заливка к ${neighbour.name}`, color: fill, under: [backdrop, neighbour.color] },
	{ name: 'заливка к подложке', color: fill, under: [backdrop] },
]

const GRAPHICS: readonly IGraphic[] = [
	{
		name: 'отметка CheckBox',
		render: (variant) =>
			h('span', { style: 'display: flex; gap: 8px' }, [
				h('span', { 'data-view': 'outlined' }, [h(CheckBox, { value: true, variant })]),
				h('span', { 'data-view': 'plain' }, [
					h(CheckBox, { value: true, variant, view: 'plain' }),
				]),
			]),
		pairs: (root, backdrop) =>
			['outlined', 'plain'].map((view) => {
				const box = part(root, `[data-view="${view}"] .so-check-box__container`)

				return {
					name: `${view}: отметка к ${view === 'plain' ? 'подложке' : 'коробке'}`,
					color: style(part(box, 'svg')).fill,
					under: [backdrop, style(box).backgroundColor],
				}
			}),
	},
	{
		name: 'отметка радио',
		render: (variant) =>
			h('span', { style: 'display: flex; gap: 8px' }, [
				h('span', { 'data-view': 'dot' }, [
					h(RadioGroup, { value: 'a', variant }, () => [
						h(RadioGroupItem, { value: 'a' }, () => 'Точка'),
					]),
				]),
				h('span', { 'data-view': 'ring' }, [
					h(RadioGroup, { value: 'a', variant, view: 'ring' }, () => [
						h(RadioGroupItem, { value: 'a' }, () => 'Кольцо'),
					]),
				]),
			]),
		pairs: (root, backdrop) => {
			const dot = part(root, '[data-view="dot"] .so-radio-group-item__control')
			const ring = part(root, '[data-view="ring"] .so-radio-group-item__control')
			const ringColor = style(ring).borderTopColor

			return [
				{
					name: 'точка к контролу',
					color: style(part(dot, '.so-radio-group-item__indicator')).backgroundColor,
					under: [backdrop, style(dot).backgroundColor],
				},
				{
					name: 'кольцо к контролу',
					color: ringColor,
					under: [backdrop, style(ring).backgroundColor],
				},
				{ name: 'кольцо к подложке', color: ringColor, under: [backdrop] },
			]
		},
	},
	{
		name: 'заливка Slider',
		render: (variant) => h(Slider, { value: 50, variant }),
		pairs: (root, backdrop) => {
			const { fill, rail } = sliderColors(root)

			return fillPairs(fill, { name: 'рельсу', color: rail }, backdrop)
		},
		hovered: {
			target: (root) => find('.so-slider', root),
			changes: (root) => sliderColors(root).rail,
			pairs: (root, backdrop) => {
				const { fill, rail } = sliderColors(root)

				return [
					{
						name: 'заливка к рельсу под наведением',
						color: fill,
						under: [backdrop, rail],
					},
				]
			},
		},
	},
	{
		name: 'заливка ProgressLinear',
		render: (variant) => h(ProgressLinear, { variant, value: 40 }),
		// Корень и есть дорожка
		pairs: (root, backdrop) => {
			const bar = part(root, '.so-progress-linear')

			return fillPairs(
				style(part(bar, '.so-progress-linear__range')).backgroundColor,
				{ name: 'дорожке', color: style(bar).backgroundColor },
				backdrop,
			)
		},
	},
	{
		name: 'дуга ProgressSpinner',
		render: (variant) => h(ProgressSpinner, { variant, value: 40 }),
		pairs: (root, backdrop) =>
			fillPairs(
				style(part(root, '.so-progress-spinner__range')).stroke,
				{ name: 'дорожке', color: style(part(root, '.so-progress-spinner__track')).stroke },
				backdrop,
			),
	},
	{
		name: 'полоса под активным табом',
		render: (variant) =>
			h(
				Tabs,
				{ variant },
				{
					default: () => [
						h(TabsItem, { key: 'a', value: 'a', text: 'Первый', active: true }),
						h(TabsItem, { key: 'b', value: 'b', text: 'Второй' }),
					],
				},
			),
		// Полоса — `::after` списка у вида по умолчанию
		pairs: (root, backdrop) => [
			{
				name: 'полоса к подложке',
				color: style(part(root, '.so-tabs__list'), '::after').backgroundColor,
				under: [backdrop],
			},
		],
	},
]

const caseName = (variant?: TComponentVariant) => variant ?? 'без варианта'

/** Подложка со случаями: на каждый вариант — компонент в своей ячейке. */
const backdropRow = (backdrop: TBackdrop, graphic: IGraphic): VNode =>
	h(
		'div',
		{
			key: backdrop,
			'data-backdrop': backdrop,
			style: `background: ${BACKDROPS[backdrop]}; color: var(--so-component-text); padding: 8px; display: flex; flex-wrap: wrap; gap: 16px`,
		},
		VARIANTS.map((variant) =>
			h('div', { key: caseName(variant), 'data-case': caseName(variant), style: 'width: 240px' }, [
				graphic.render(variant),
			]),
		),
	)

/**
 * Все случаи в схеме. Узлы плагины получают кадром позже, выбор радио и таба
 * ставит расширение, и цвет кольца идёт за ним переходом — его дожидаемся.
 * Указатель уведён со всех компонентов: наведение меняет рельс.
 */
async function show(scheme: TScheme, graphic: IGraphic): Promise<void> {
	document.documentElement.dataset.soTheme = scheme

	render(
		defineComponent({
			render: () =>
				h('div', [
					h('div', { class: 'so-test-away', style: 'height: 24px' }),
					...(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) =>
						backdropRow(backdrop, graphic),
					),
				]),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
	await userEvent.hover(find('.so-test-away'))
	await settled(document.body)
}

/** Случай сцены: подложка, её цвет и узел случая. */
type TCase = { backdrop: TBackdrop; color: string; root: HTMLElement; name: string }

const cases = (): TCase[] =>
	(Object.keys(BACKDROPS) as TBackdrop[]).flatMap((backdrop) => {
		const row = find(`[data-backdrop="${backdrop}"]`)
		const color = style(row).backgroundColor

		return VARIANTS.map((variant) => ({
			backdrop,
			color,
			root: find(`[data-case="${caseName(variant)}"]`, row),
			name: `${backdrop} · ${caseName(variant)}`,
		}))
	})

/** Пары ниже порога — с отношением, чтобы отчёт сразу называл число. */
const faultsOf = (name: string, pairs: TPair[]): string[] =>
	pairs.flatMap((pair) => {
		const ratio = contrast(pair.color, pair.under)

		return ratio < GRAPHIC ? [`${name} · ${pair.name}: ${ratio.toFixed(2)}:1`] : []
	})

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(SCHEMES)('%s: цветная графика держит 3:1 к соседям', (scheme) => {
	/**
	 * Нарушения собираются по всей сцене, а не до первого: сломанный случай
	 * редко бывает один, и отчёт сразу называет все — подложку, вариант, пару.
	 */
	it.each(GRAPHICS)('$name: на странице и на поверхности контрола', async (graphic) => {
		await show(scheme, graphic)

		const faults = cases().flatMap(({ root, color, name }) =>
			faultsOf(name, graphic.pairs(root, color)),
		)

		const { hovered } = graphic

		if (hovered) {
			for (const { root, color, name } of cases()) {
				const resting = hovered.changes(root)

				await userEvent.hover(hovered.target(root))
				await settled(document.body)

				if (hovered.changes(root) === resting) faults.push(`${name}: наведение не видно`)

				faults.push(...faultsOf(name, hovered.pairs(root, color)))
			}
		}

		expect(faults).toEqual([])
	})
})
