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
 * (500) и в светлой схеме до 3:1 не дотягивали.
 *
 * Исключения — решение владельца о виде графики: в светлой схеме заливка
 * Slider и индикаторов к своей вуали — рельсу и дорожке — держит 3:1 не у
 * всех вариантов (`exempt` у случая; `themes/oren/AGENTS.md`, «Что тестом не
 * проверяется», «заливка к рельсу и дорожке»). Список точный: пара из него,
 * которая держит 3:1, и исключение, которому в сцене не нашлось пары, — тоже
 * нарушения, иначе он устарел бы молча.
 *
 * Сторож токенов (`themes/oren/__tests__/tokens.spec.ts`) держит только пары
 * с самими поверхностями и только по числам токенов. Вуаль поверх них — рельс
 * и дорожки — и то, что каждое место берёт цвет из токена, видно лишь здесь.
 *
 * Пар у звёзд Rating нет: их заливка — записанное исключение по решению
 * владельца о виде звёзд (`themes/oren/AGENTS.md`, «Что тестом не
 * проверяется», «звёзды Rating»).
 *
 * Раздел «граница контрола» в конце файла меряет не графику, а линию, по
 * которой контрол узнают на странице (`themes/oren/AGENTS.md`, «Граница
 * контрола — своя ступень»): рамку коробки CheckBox `outlined` и неотмеченного
 * `filled`, кольцо невыбранного радио обоих видов, контур выключенной дорожки
 * Switch и рельса Slider (`themes/oren/src/mixins/_boundary.scss`) и кромку
 * выключенной ручки Switch. Ей нужно те же 3:1 (WCAG 1.4.11): к подложке,
 * рамке и кольцу — ещё и к своей поверхности, кромке — к дорожке под ручкой; у
 * каждого варианта и нейтрали, в покое, под наведением и в ошибке поля —
 * `data-invalid` красит именно границу, и граница каждого варианта в ошибке
 * обязана быть цвета `negative`. Исключений у раздела нет. CheckBox `plain`
 * рамки не имеет по виду, и раздел его не меряет; выключенный контрол 1.4.11
 * не касается. Пар Rating нет и здесь: пустая звезда — граница оценки, но вид
 * звёзд владелец оставил прежним, и она в том же исключении, что и заливка.
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
	Field,
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

import { contrast, find, insetRing, pixel, settled, style } from './colors'

import '@soldy-ui/theme-oren'

/** Обе схемы: цвет графики у них свой, а правило одно. */
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

/** Варианты со своим цветом: `normal` — та же нейтраль, что и без варианта. */
const COLORED = COMPONENT_VARIANTS.filter((variant) => variant !== 'normal')

/**
 * Варианты, у которых в светлой схеме заливка Slider и индикаторов к своей
 * вуали в покое держит меньше 3:1 — 2,56–2,91:1. Под наведением рельс Slider
 * плотнее, и там ниже 3:1 у всех вариантов со своим цветом — 2,40–2,88:1.
 */
const BELOW_ON_VEIL: readonly TComponentVariant[] = ['positive', 'caution']

/** Порог WCAG 2 для графики (1.4.11). */
const GRAPHIC = 3

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Пара «графика — сосед»: цвет графики и слои соседа снизу вверх, первым —
 * подложка, на которой стоит компонент.
 */
type TPair = { name: string; color: string; under: string[] }

/** Исключения схемы: имя пары — варианты, у которых она ниже 3:1. */
type TExempt = Readonly<Record<string, readonly TComponentVariant[]>>

/** Компонент случая — с вариантом или без. */
type TRender = (variant?: TComponentVariant) => VNode

/** Наведение на случай — если оно меняет соседа графики или саму границу. */
type TPointer = {
	/** На что навести указатель. */
	target: (root: HTMLElement) => HTMLElement
	/** Что наведение обязано изменить, — иначе проверка пуста. */
	changes: (root: HTMLElement) => string
}

interface IGraphic {
	name: string
	render: TRender
	/** Пары в покое: `root` — узел случая, `backdrop` — цвет его подложки. */
	pairs: (root: HTMLElement, backdrop: string) => TPair[]
	/** Пары под наведением — если наведение меняет соседа графики. */
	hovered?: TPointer & { pairs: (root: HTMLElement, backdrop: string) => TPair[] }
	/**
	 * Пары ниже 3:1 по решению владельца (см. шапку) — по схеме, на обеих
	 * подложках. Случай без варианта исключением не бывает.
	 */
	exempt?: Partial<Record<TScheme, TExempt>>
}

/** Часть по селектору — и SVG тоже; нет её — тест падает здесь, а не на чтении свойства. */
function part(root: Element, selector: string): Element {
	const element = root.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

/** Кольцо части — контур или кромка; нет его — тест падает здесь, как у `part()`. */
function ring(root: Element, selector: string, pseudo?: string): string {
	const color = insetRing(part(root, selector), pseudo)

	if (!color) throw new Error(`${selector}${pseudo ?? ''}: кольца нет`)

	return color
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
		exempt: {
			oren: {
				'заливка к рельсу': BELOW_ON_VEIL,
				'заливка к рельсу под наведением': COLORED,
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
		exempt: { oren: { 'заливка к дорожке': BELOW_ON_VEIL } },
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
		exempt: { oren: { 'заливка к дорожке': BELOW_ON_VEIL } },
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
const backdropRow = (backdrop: TBackdrop, content: TRender): VNode =>
	h(
		'div',
		{
			key: backdrop,
			'data-backdrop': backdrop,
			style: `background: ${BACKDROPS[backdrop]}; color: var(--so-component-text); padding: 8px; display: flex; flex-wrap: wrap; gap: 16px`,
		},
		VARIANTS.map((variant) =>
			h(
				'div',
				{ key: caseName(variant), 'data-case': caseName(variant), style: 'width: 240px' },
				[content(variant)],
			),
		),
	)

/**
 * Все случаи в схеме. Узлы плагины получают кадром позже, выбор радио и таба
 * ставит расширение, и цвет кольца идёт за ним переходом — его дожидаемся.
 * Указатель уведён со всех компонентов: наведение меняет рельс.
 */
async function show(scheme: TScheme, content: TRender): Promise<void> {
	document.documentElement.dataset.soTheme = scheme

	render(
		defineComponent({
			render: () =>
				h('div', [
					h('div', { class: 'so-test-away', style: 'height: 24px' }),
					...(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) =>
						backdropRow(backdrop, content),
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

/** Случай сцены: подложка, её цвет, вариант и узел случая. */
type TCase = {
	backdrop: TBackdrop
	color: string
	variant?: TComponentVariant
	root: HTMLElement
	name: string
}

const cases = (): TCase[] =>
	(Object.keys(BACKDROPS) as TBackdrop[]).flatMap((backdrop) => {
		const row = find(`[data-backdrop="${backdrop}"]`)
		const color = style(row).backgroundColor

		return VARIANTS.map((variant) => ({
			backdrop,
			color,
			variant,
			root: find(`[data-case="${caseName(variant)}"]`, row),
			name: `${backdrop} · ${caseName(variant)}`,
		}))
	})

/** Ключ исключения: пара и вариант. */
const exemptKey = (pair: string, variant: TComponentVariant) => `${pair} · ${variant}`

/**
 * Нарушения пар случая — с отношением, чтобы отчёт сразу называл число: пара
 * ниже порога, а исключённая — если держит. Исключения, которые встретились,
 * пишутся в `seen`.
 */
const faultsOf = (exempt: TExempt, seen: Set<string>, scene: TCase, pairs: TPair[]): string[] =>
	pairs.flatMap((pair) => {
		const ratio = contrast(pair.color, pair.under)
		const fault = `${scene.name} · ${pair.name}: ${ratio.toFixed(2)}:1`
		const { variant } = scene

		if (variant === undefined || !exempt[pair.name]?.includes(variant)) {
			return ratio < GRAPHIC ? [fault] : []
		}

		seen.add(exemptKey(pair.name, variant))

		return ratio < GRAPHIC ? [] : [`${fault} — держит, исключение лишнее`]
	})

/**
 * Указатель — на случай, переход доигран. Не изменилось то, что наведение
 * обязано изменить, — нарушение: пары под наведением были бы парами покоя.
 */
async function hover(scene: TCase, pointer: TPointer): Promise<string[]> {
	const resting = pointer.changes(scene.root)

	await userEvent.hover(pointer.target(scene.root))
	await settled(document.body)

	return pointer.changes(scene.root) === resting ? [`${scene.name}: наведение не видно`] : []
}

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
		await show(scheme, graphic.render)

		const exempt = graphic.exempt?.[scheme] ?? {}
		const seen = new Set<string>()
		const faults = cases().flatMap((scene) =>
			faultsOf(exempt, seen, scene, graphic.pairs(scene.root, scene.color)),
		)

		const { hovered } = graphic

		if (hovered) {
			for (const scene of cases()) {
				faults.push(
					...(await hover(scene, hovered)),
					...faultsOf(exempt, seen, scene, hovered.pairs(scene.root, scene.color)),
				)
			}
		}

		// Исключение без пары в сцене — опечатка в имени пары или пропавшая пара
		for (const [pair, variants] of Object.entries(exempt)) {
			const missing = variants.filter((variant) => !seen.has(exemptKey(pair, variant)))

			faults.push(...missing.map((variant) => `исключение без пары: ${pair} · ${variant}`))
		}

		expect(faults).toEqual([])
	})
})

// Раздел «граница контрола» — см. шапку файла.

/**
 * Граница контрола: линия, по которой его узнают, и её пары с соседями. Под
 * наведением пары те же.
 */
interface IBoundary {
	name: string
	render: TRender
	/** Граница, которую красят вариант и ошибка поля. */
	boundary: (root: HTMLElement) => string
	/** Пары границы: `root` — узел случая, `backdrop` — цвет его подложки. */
	pairs: (root: HTMLElement, backdrop: string) => TPair[]
	/** У рамки и кольца наведение меняет их цвет, у дорожки и рельса — вуаль. */
	hovered: TPointer
}

/**
 * Граница рамкой — коробка CheckBox и кольцо радио: цвет рамки к подложке
 * снаружи и к поверхности самой части внутри. Наведение меняет саму рамку.
 */
const bordered = ({
	selector,
	line,
	inside,
	target,
}: {
	/** Часть с рамкой. */
	selector: string
	/** Имя линии в паре. */
	line: string
	/** Что у линии внутри — для имени пары. */
	inside: string
	/** На что навести указатель. */
	target: string
}): Omit<IBoundary, 'name' | 'render'> => {
	const color = (root: HTMLElement) => style(part(root, selector)).borderTopColor

	return {
		boundary: color,
		pairs: (root, backdrop) => [
			{ name: `${line} к подложке`, color: color(root), under: [backdrop] },
			{
				name: `${line} к ${inside}`,
				color: color(root),
				under: [backdrop, style(part(root, selector)).backgroundColor],
			},
		],
		hovered: { target: (root) => find(target, root), changes: color },
	}
}

const CHECK_BOX_FRAME = bordered({
	selector: '.so-check-box__container',
	line: 'рамка',
	inside: 'коробке',
	target: '.so-check-box',
})

const RADIO_RING = bordered({
	selector: '.so-radio-group-item__control',
	line: 'кольцо',
	inside: 'контролу',
	target: '.so-radio-group-item',
})

/** Контур выключенной дорожки Switch и кромка ручки на ней. */
const switchPairs = (root: HTMLElement, backdrop: string): TPair[] => [
	{
		name: 'контур дорожки к подложке',
		color: ring(root, '.so-switch__track'),
		under: [backdrop],
	},
	{
		name: 'кромка ручки к дорожке',
		color: ring(root, '.so-switch__track--thumb'),
		under: [backdrop, style(part(root, '.so-switch__track')).backgroundColor],
	},
]

/**
 * Неотмеченное, невыбранное и выключенное — то, что узнают только по
 * границе. CheckBox `plain` в списке нет: рамки у него нет по виду.
 */
const BOUNDARIES: readonly IBoundary[] = [
	{
		name: 'рамка CheckBox outlined',
		render: (variant) => h(CheckBox, { variant }),
		...CHECK_BOX_FRAME,
	},
	{
		// Неотмеченную коробку `filled` рисует вид по умолчанию
		name: 'рамка неотмеченного CheckBox filled',
		render: (variant) => h(CheckBox, { variant, view: 'filled' }),
		...CHECK_BOX_FRAME,
	},
	{
		name: 'кольцо невыбранного радио dot',
		render: (variant) =>
			h(RadioGroup, { variant }, () => [h(RadioGroupItem, { value: 'a' }, () => 'Точка')]),
		...RADIO_RING,
	},
	{
		name: 'кольцо невыбранного радио ring',
		render: (variant) =>
			h(RadioGroup, { variant, view: 'ring' }, () => [
				h(RadioGroupItem, { value: 'a' }, () => 'Кольцо'),
			]),
		...RADIO_RING,
	},
	{
		name: 'выключенный Switch',
		render: (variant) => h(Switch, { variant }),
		boundary: (root) => ring(root, '.so-switch__track'),
		pairs: switchPairs,
		hovered: {
			target: (root) => find('.so-switch', root),
			changes: (root) => style(part(root, '.so-switch__track')).backgroundColor,
		},
	},
	{
		name: 'рельс Slider',
		render: (variant) => h(Slider, { value: 50, variant }),
		boundary: (root) => ring(root, '.so-slider__track', '::before'),
		pairs: (root, backdrop) => [
			{
				name: 'контур рельса к подложке',
				color: ring(root, '.so-slider__track', '::before'),
				under: [backdrop],
			},
		],
		hovered: {
			target: (root) => find('.so-slider', root),
			changes: (root) => sliderColors(root).rail,
		},
	},
]

/** Те же случаи в поле с ошибкой: `data-invalid` контролу ставит `Field`. */
const invalid =
	(content: TRender): TRender =>
	(variant) =>
		h(Field, { label: 'Подпись', error: 'Ошибка', invalid: true }, () => content(variant))

/** Исключений у границы нет: узнаваемость контрола владелец не исключал. */
const NO_EXEMPT: TExempt = {}

/** Граница случая в состоянии — по ней ошибка сверяется с `negative`. */
type TBoundaryLook = { state: string; scene: TCase; color: string }

/**
 * Нарушения границ сцены: пары каждого случая в покое, затем под указателем —
 * по случаю за раз. Границу каждого случая в каждом состоянии отдаёт вторым.
 */
async function boundaryFaults(
	entry: IBoundary,
): Promise<{ faults: string[]; looks: TBoundaryLook[] }> {
	const seen = new Set<string>()
	const looks: TBoundaryLook[] = []
	const faults = cases().flatMap((scene) => {
		looks.push({ state: 'в покое', scene, color: entry.boundary(scene.root) })

		return faultsOf(NO_EXEMPT, seen, scene, entry.pairs(scene.root, scene.color))
	})

	for (const scene of cases()) {
		faults.push(...(await hover(scene, entry.hovered)))
		looks.push({ state: 'под наведением', scene, color: entry.boundary(scene.root) })
		faults.push(
			...faultsOf(
				NO_EXEMPT,
				seen,
				scene,
				entry
					.pairs(scene.root, scene.color)
					.map((pair) => ({ ...pair, name: `${pair.name} под наведением` })),
			),
		)
	}

	return { faults, looks }
}

/**
 * Граница в ошибке у каждого варианта — та же, что у `negative` на той же
 * подложке и в том же состоянии: иначе правило варианта перебило правило
 * ошибки.
 */
const unlikeNegative = (looks: readonly TBoundaryLook[]): string[] =>
	looks.flatMap(({ state, scene, color }) => {
		const negative = looks.find(
			(look) =>
				look.state === state &&
				look.scene.backdrop === scene.backdrop &&
				look.scene.variant === 'negative',
		)

		if (!negative) throw new Error(`${scene.backdrop}: случая negative нет`)

		return pixel([color]).join() === pixel([negative.color]).join()
			? []
			: [`${scene.name} · граница ${state} — не цвета negative`]
	})

describe.each(SCHEMES)('%s: граница контрола держит 3:1 к соседям', (scheme) => {
	it.each(BOUNDARIES)('$name: на странице и на поверхности контрола', async (entry) => {
		await show(scheme, entry.render)

		const { faults } = await boundaryFaults(entry)

		expect(faults).toEqual([])
	})

	it.each(BOUNDARIES)(
		'$name в ошибке поля: цвета negative, на обеих подложках',
		async (entry) => {
			await show(scheme, invalid(entry.render))

			const { faults, looks } = await boundaryFaults(entry)

			expect([...faults, ...unlikeNegative(looks)]).toEqual([])
		},
	)
})
