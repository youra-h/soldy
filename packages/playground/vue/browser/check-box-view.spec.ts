/**
 * Виды CheckBox в настоящем браузере — по вычисленным стилям коробки.
 *
 * Цвета вида решает дизайн, и тест их не знает: как выглядит коробка,
 * проверяется глазами (`themes/oren/AGENTS.md`, «Что тестом не проверяется»).
 * Здесь — отношения между видами и состояниями, которые ломаются молча.
 * Правило вида спорит с правилами вида по умолчанию и варианта только
 * специфичностью и порядком: выключенный `plain` так и получал фон вида по
 * умолчанию — правило выключенной коробки оказалось сильнее. В jsdom каскада
 * нет.
 *
 * Состояние коробки задают пропы при монтировании, а не переключение: у
 * коробки переход цвета, и после смены пропа читался бы промежуточный цвет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { COMPONENT_VARIANTS } from '@soldy-ui/playground-shared'
import { CheckBox } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

type TProps = Record<string, unknown>

/** Что видно у коробки. Отметки у неотмеченной нет — `null`. */
type TLook = {
	background: string
	border: string
	mark: string | null
	opacity: string
}

/** Состояния коробки — пропы при монтировании. */
const STATES = {
	off: {},
	on: { value: true },
	mixed: { indeterminate: true },
	mixedOn: { indeterminate: true, value: true },
	offDisabled: { disabled: true },
	onDisabled: { value: true, disabled: true },
} satisfies Record<string, TProps>

/** Варианты со своим цветом: `normal` — та же нейтраль, что и без варианта. */
const COLORED = COMPONENT_VARIANTS.filter((variant) => variant !== 'normal')

/** Нейтраль — блок без варианта — и каждый вариант со своим цветом. */
const COLORS = [
	{ name: 'нейтраль', variant: undefined },
	...COLORED.map((variant) => ({ name: variant, variant })),
]

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const style = (element: Element) => getComputedStyle(element)

/**
 * Переход цвета коробки доигрывает, прежде чем цвет читают.
 * `getAnimations()` сам пересчитывает стили, поэтому переход, запущенный
 * уходом указателя, в списке уже есть.
 */
const settled = (element: Element) =>
	Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished))

/** Коробки во всех состояниях с общими пропами: случай `<префикс>:<состояние>`. */
const cases = (prefix: string, props: TProps): Record<string, TProps> =>
	Object.fromEntries(
		Object.entries(STATES).map(([state, own]) => [`${prefix}:${state}`, { ...props, ...own }]),
	)

/**
 * Смонтировать коробки одной сценой, каждую — в обёртке с именем случая. Над
 * ними — место, куда уводится указатель: наведение красит коробку, а сцены
 * монтируются на одном месте.
 */
async function show(scene: Record<string, TProps>): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', [
					h('div', { class: 's-test-away', style: 'height: 24px' }),
					...Object.entries(scene).map(([name, props]) =>
						h('span', { key: name, 'data-case': name }, [h(CheckBox, props)]),
					),
				]),
		}),
	)

	await userEvent.hover(find('.s-test-away'))
	await settled(document.body)
}

/** Как выглядит коробка случая. */
function look(name: string): TLook {
	const box = find(`[data-case="${name}"] .s-check-box__container`)
	const mark = box.querySelector('svg')

	return {
		background: style(box).backgroundColor,
		border: style(box).borderTopColor,
		mark: mark && style(mark).fill,
		opacity: style(box).opacity,
	}
}

/** Коробки с префиксом во всех состояниях — по имени состояния. */
const looks = (prefix: string): Record<string, TLook> =>
	Object.fromEntries(Object.keys(STATES).map((state) => [state, look(`${prefix}:${state}`)]))

/** Заливка коробки: фон и рамка. */
const fill = ({ background, border }: TLook) => ({ background, border })

/** Фон коробок по имени состояния. */
const backgrounds = (boxes: Record<string, TLook>) =>
	Object.fromEntries(Object.entries(boxes).map(([state, box]) => [state, box.background]))

/** Одно и то же значение во всех состояниях. */
const inEveryState = (value: string) =>
	Object.fromEntries(Object.keys(STATES).map((state) => [state, value]))

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

/**
 * Своего правила у `outlined` нет: это вид блока без модификатора, а
 * модификатор ядро ставит, только когда вид задан явно.
 */
describe('outlined — вид блока без модификатора', () => {
	it.each(COLORS)(
		'$name: во всех состояниях коробка та же, что без вида',
		async ({ variant }) => {
			await show({
				...cases('none', { variant }),
				...cases('outlined', { variant, view: 'outlined' }),
			})

			expect(find('[data-case="outlined:off"] .s-check-box').classList).toContain(
				's-check-box--view-outlined',
			)
			expect(looks('outlined')).toEqual(looks('none'))
		},
	)
})

describe.each(COLORS)('filled, $name: заливка идёт за отметкой', ({ variant }) => {
	beforeEach(async () => {
		await show(cases('filled', { variant, view: 'filled' }))
	})

	it('неотмеченная коробка залита иначе, чем отмеченная', () => {
		const boxes = looks('filled')

		expect(boxes.off.background).not.toBe(boxes.on.background)
	})

	it('частичный выбор залит как отмеченный — и без value, и с ним', () => {
		const boxes = looks('filled')

		expect(boxes.mixed).toEqual(boxes.on)
		expect(boxes.mixedOn).toEqual(boxes.on)
	})

	/** Выключенную отмеченную гасит прозрачность блока, а не другая заливка. */
	it('выключенная отмеченная сохраняет заливку отмеченной', () => {
		const boxes = looks('filled')

		expect(Number(boxes.onDisabled.opacity)).toBeLessThan(1)
		expect(fill(boxes.onDisabled)).toEqual(fill(boxes.on))
	})
})

/**
 * Своего цвета у неотмеченной коробки нет: её целиком рисует вид по
 * умолчанию — поверхность контрола, рамка варианта, у выключенной своя
 * ступень. `filled` её не красит вовсе, иначе выключенной она выглядит
 * всегда: заливка неотмеченной совпадала со ступенью выключенной.
 */
describe('filled — неотмеченная коробка такая же, как у outlined', () => {
	it.each(COLORS)('$name: и в покое, и выключенная', async ({ variant }) => {
		await show({
			...cases('outlined', { variant, view: 'outlined' }),
			...cases('filled', { variant, view: 'filled' }),
		})

		const outlined = looks('outlined')
		const filled = looks('filled')

		expect(filled.off).toEqual(outlined.off)
		expect(filled.offDisabled).toEqual(outlined.offDisabled)
	})
})

/**
 * Заливка `filled` — только у отмеченной коробки, поэтому цвет варианта
 * различается там заливкой, а у неотмеченной — рамкой вида по умолчанию:
 * фон у неё общий, поверхность контрола.
 */
describe('filled — цвет варианта', () => {
	it.each(COLORED)(
		'%s: отмеченная отличается от нейтрали заливкой, неотмеченная — рамкой',
		async (variant) => {
			await show({
				...cases('neutral', { view: 'filled' }),
				...cases(variant, { variant, view: 'filled' }),
			})

			const neutral = looks('neutral')
			const colored = looks(variant)

			expect(colored.on.background).not.toBe(neutral.on.background)
			expect(colored.off.background).toBe(neutral.off.background)
			expect(colored.off.border).not.toBe(neutral.off.border)
		},
	)
})

/**
 * Фон выключенной коробке даёт вид по умолчанию, и правило вида обязано его
 * перекрыть: у нейтрали — специфичностью, у варианта при равной
 * специфичности — порядком. Проигрывало оно молча, поэтому здесь каждый цвет.
 */
describe('plain — без фона в любом состоянии', () => {
	it.each(COLORS)('$name: и выключенная коробка прозрачна', async ({ variant }) => {
		await show(cases('plain', { variant, view: 'plain' }))

		expect(backgrounds(looks('plain'))).toEqual(inEveryState(TRANSPARENT))
	})
})
