/**
 * ProgressLinear в настоящем браузере: переход доли, бег, ось и принудительные
 * цвета — тема.
 *
 * Долю и наборы считает ядро (`core/__tests__/progress-linear.spec.ts`),
 * разметку — адаптер (`ui/vue/__tests__/progress-linear.spec.ts`). Здесь то,
 * чего jsdom не видит вовсе: он не считает ни стилей, ни раскладки и не
 * заводит ни переходов, ни анимаций. Как полоса лежит и движется, решает тема
 * (`themes/oren/src/components/progress-linear/_progress-linear.scss`): доля
 * едет переходом, бег — сдвиг отрезка, у горизонтальной зеркальный в RTL, у
 * вертикальной — снизу вверх в любом направлении письма. Без движения доля
 * встаёт сразу, а вместо бега мерцает вся дорожка. В принудительных цветах
 * дорожка, заливка и бегущий отрезок берут системные цвета: браузер иначе
 * заменил бы их фоны цветом поверхности.
 *
 * Переходы ловит слушатель, повешенный до действия, а не снимок после него:
 * переход короткий, и `getAnimations()` после действия мог бы его уже не
 * застать.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import { TProgressLinear } from '@soldy-ui/core'
import type { IProgressLinearProps } from '@soldy-ui/core'
import { ProgressLinear } from '@soldy-ui/vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'

import { find, pixel, systemColor } from './colors'
import { DIRECTION_CASES, setDir, sidesOf, type TLine } from './directions'
import { forcedColors, reducedMotion } from './media'
import { animatedProperties, settled, transitionEvents, transitionRuns } from './transitions'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление длины, px. */
const EPSILON = 0.5

/** Высота вертикальной полосы по умолчанию — `h-40` темы, px. */
const VERTICAL_LENGTH = 160

/** Схемы темы: палитру принудительных цветов выбирает браузер, но проверяем обе. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Полоса на странице шириной 400 px. Значение держит экземпляр ядра: через
 * него тест и меняет долю, флаг и ось. `dir` — направление узла, в котором
 * стоит полоса.
 */
function mount(props: Partial<IProgressLinearProps> = {}, dir?: TLine) {
	const ctrl = new TProgressLinear(props)

	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: 'width: 400px; padding: 24px' }, [
					h(ProgressLinear, { ctrl }),
				]),
		}),
	)

	return ctrl
}

const root = () => find('.s-progress-linear')
const range = () => find('.s-progress-linear__range')

/** Бегущий отрезок: его вычисленный стиль — у псевдоэлемента корня. */
const segment = () => getComputedStyle(root(), '::after')

/** Длина заливки долей дорожки — по ширине у горизонтальной. */
const filled = () => range().getBoundingClientRect().width / root().getBoundingClientRect().width

/** Длина заливки долей дорожки — по высоте у вертикальной. */
const filledUp = () =>
	range().getBoundingClientRect().height / root().getBoundingClientRect().height

/** Коробка корня полосы: смонтировать, дождаться отрисовки, измерить и снять. */
async function boxOf(props: Partial<IProgressLinearProps>): Promise<DOMRect> {
	mount(props)
	await transitionEvents()

	const box = root().getBoundingClientRect()

	cleanup()

	return box
}

/**
 * С какой длины заливка пошла переходом — по первому кадру перехода, который
 * браузер завёл. Кадр читается в слушателе `transitionrun`, пока переход
 * ещё идёт.
 */
function transitionStarts(element: HTMLElement): string[] {
	const starts: string[] = []

	element.addEventListener('transitionrun', ({ propertyName }) => {
		const transition = element
			.getAnimations()
			.find(
				(animation) =>
					animation instanceof CSSTransition &&
					animation.transitionProperty === propertyName,
			)
		const [first] =
			transition?.effect instanceof KeyframeEffect ? transition.effect.getKeyframes() : []

		starts.push(`${propertyName} ${String(first?.[propertyName])}`)
	})

	return starts
}

/**
 * Анимация отрезка — у псевдоэлемента корня: бег, а без движения — мерцание.
 * Нет её — тест падает здесь.
 */
function runOf(element: HTMLElement): CSSAnimation {
	const found = element
		.getAnimations({ subtree: true })
		.find(
			(animation) =>
				animation instanceof CSSAnimation &&
				animation.effect instanceof KeyframeEffect &&
				animation.effect.pseudoElement === '::after',
		)

	if (!(found instanceof CSSAnimation)) throw new Error('анимации отрезка нет')

	return found
}

/**
 * Сдвиг вдоль оси из вычисленного `translate`: по X у горизонтальной, по Y у
 * вертикальной. Браузер пишет сдвиг одним значением, пока по Y он нулевой
 * (`-100%`), и двумя, когда нет (`0px 12.5%`).
 */
function shiftAlong(translate: string, axis: 'x' | 'y'): number {
	const [x = '0', y = '0'] = translate === 'none' ? [] : translate.split(' ')

	return Number.parseFloat(axis === 'x' ? x : y)
}

/**
 * Сдвиг отрезка на долях круга бега — в процентах его длины, как их считает
 * браузер. Бег встаёт на паузу: коробки псевдоэлемента браузер не отдаёт, а
 * вычисленный сдвиг — отдаёт.
 */
function shiftsAt(progress: readonly number[], axis: 'x' | 'y' = 'x'): number[] {
	const run = runOf(root())
	const duration = run.effect?.getTiming().duration

	if (typeof duration !== 'number') throw new Error('длительности бега числом нет')

	run.pause()

	return progress.map((share) => {
		run.currentTime = duration * share

		return shiftAlong(segment().translate, axis)
	})
}

/** Цвет фона — байтами sRGB: запись браузера сравнивать нельзя. */
const backgroundOf = (style: CSSStyleDeclaration) => pixel([style.backgroundColor])

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(async () => {
	cleanup()
	setDir(document.documentElement)
	await reducedMotion('no-preference')
	await forcedColors('none')
})

describe('доля', () => {
	it('монтирование на доле — заливка сразу на месте, без перехода', async () => {
		mount({ value: 40 })

		// Слушатель — до первого кадра: переход на монтировании он бы застал
		const runs = transitionRuns(range())

		await transitionEvents()

		expect(runs).toEqual([])
		expect(filled()).toBeCloseTo(0.4, 2)
	})

	it('смена доли — переходом от прежней', async () => {
		const ctrl = mount({ value: 40 })

		await transitionEvents()

		const starts = transitionStarts(range())

		ctrl.value = 80
		await transitionEvents()

		// Логическое `inline-size` Chromium ведёт физическим свойством
		expect(starts).toEqual(['width 40%'])
	})

	/**
	 * Пока полоса бежит, переменной доли нет, и заливка под бегом уходит к
	 * нулю. Доля, вернувшаяся со снятием флага, растёт от начала дорожки, а не
	 * с места, где заливку оставили перед бегом.
	 */
	it('от бега к доле — заливка растёт от нуля', async () => {
		const ctrl = mount({ value: 25 })

		await transitionEvents()

		// Под бегом заливка уходит к нулю тем же переходом — дождаться его
		ctrl.indeterminate = true
		await transitionEvents()
		await settled(range())

		const starts = transitionStarts(range())

		// Значение, записанное во время бега, ждёт снятия флага
		ctrl.value = 60
		ctrl.indeterminate = false
		await transitionEvents()

		expect(starts).toEqual(['width 0%'])
	})

	it('система просит меньше движения — доля встаёт сразу', async () => {
		await reducedMotion('reduce')

		const ctrl = mount({ value: 40 })

		await transitionEvents()

		const runs = transitionRuns(range())

		ctrl.value = 80
		await transitionEvents()

		expect(runs).toEqual([])
		expect(filled()).toBeCloseTo(0.8, 2)
	})
})

describe('бег', () => {
	it('флаг включает бег поверх доли: заливка спрятана, а отрезок идёт к концу строки', async () => {
		const ctrl = mount({ value: 40 })

		await transitionEvents()

		ctrl.indeterminate = true
		await transitionEvents()

		expect(getComputedStyle(range()).visibility).toBe('hidden')
		expect(segment().left).toBe('0px')

		const [quarter, half, threeQuarters] = shiftsAt([0.25, 0.5, 0.75])

		expect(quarter).toBeLessThan(half)
		expect(half).toBeLessThan(threeQuarters)
	})

	it('в RTL бег зеркальный: отрезок стоит справа и идёт влево', async () => {
		mount({ indeterminate: true })
		await transitionEvents()

		const ltr = shiftsAt([0.25, 0.5, 0.75])

		cleanup()
		mount({ indeterminate: true }, 'rtl')
		await transitionEvents()

		expect(segment().right).toBe('0px')
		expect(shiftsAt([0.25, 0.5, 0.75])).toEqual(ltr.map((shift) => -shift))
	})

	/**
	 * Бег — движение, и без него (здесь — по просьбе системы) отрезок не
	 * бежит. Стоять ему нельзя: стоящий отрезок читался бы зависшей полосой.
	 * Вместо бега вся дорожка мерцает прозрачностью: отрезок во всю её длину,
	 * на месте, и кадры ведут одну прозрачность. Режим приложения поверх
	 * системы — `browser/motion-mode.spec.ts`.
	 */
	it('система просит меньше движения — бега нет, мерцает вся дорожка', async () => {
		await reducedMotion('reduce')

		// Эмуляция действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

		mount({ indeterminate: true })
		await transitionEvents()

		expect(Math.abs(Number.parseFloat(segment().width) - root().clientWidth)).toBeLessThan(
			EPSILON,
		)
		expect(segment().translate).toBe('none')
		expect(animatedProperties(runOf(root()))).toEqual(['opacity'])
	})
})

/**
 * Место отрезка — логическое, его браузер ставит у начала строки сам, а знак
 * сдвига — тема: у сдвига логических направлений нет. Знак она берёт у
 * ближайшего `dir`, как браузер — направленность, поэтому полоса с
 * `direction="ltr"` в RTL-предке бежит слева направо (`browser/directions.ts`).
 */
describe.each(DIRECTION_CASES)('бег по ближайшему dir: $name', (scenario) => {
	const { start } = sidesOf(scenario.line)

	/** Конец строки справа — сдвиг к нему растёт, слева — убывает. */
	const toEnd = scenario.line === 'ltr' ? 1 : -1

	it('отрезок стоит у начала строки и идёт к её концу', async () => {
		setDir(document.documentElement, scenario.page)
		mount({ indeterminate: true, direction: scenario.direction }, scenario.ancestor)
		await transitionEvents()

		expect(segment()[start], 'отрезок у начала строки').toBe('0px')

		const [quarter, half, threeQuarters] = shiftsAt([0.25, 0.5, 0.75])

		expect(toEnd * (half - quarter), 'к концу строки').toBeGreaterThan(0)
		expect(toEnd * (threeQuarters - half), 'к концу строки').toBeGreaterThan(0)
	})
})

/**
 * Вертикальная полоса повторяет решения вертикального ползунка: строчный
 * блок своей высоты, толщина по размеру — поперёк оси, заливка и бег снизу
 * вверх.
 */
describe('вертикальная полоса', () => {
	it.each(COMPONENT_SIZES)(
		'размер %s: 160 px в высоту, толщина как у горизонтальной',
		async (size) => {
			const horizontal = await boxOf({ size })
			const vertical = await boxOf({ size, orientation: 'vertical' })

			expect(horizontal.height).toBeGreaterThan(0)
			expect(Math.abs(vertical.height - VERTICAL_LENGTH)).toBeLessThan(EPSILON)
			expect(Math.abs(vertical.width - horizontal.height)).toBeLessThan(EPSILON)
		},
	)

	it('заливка от низа дорожки во всю её ширину', async () => {
		mount({ value: 40, orientation: 'vertical' })
		await transitionEvents()

		const track = root().getBoundingClientRect()
		const fill = range().getBoundingClientRect()

		expect(Math.abs(fill.bottom - track.bottom)).toBeLessThan(EPSILON)
		expect(Math.abs(fill.width - track.width)).toBeLessThan(EPSILON)
		expect(filledUp()).toBeCloseTo(0.4, 2)
	})

	it('смена доли — переходом высоты от прежней', async () => {
		const ctrl = mount({ value: 40, orientation: 'vertical' })

		await transitionEvents()

		const starts = transitionStarts(range())

		ctrl.value = 80
		await transitionEvents()

		// Логическое `block-size` Chromium ведёт физическим свойством
		expect(starts).toEqual(['height 40%'])
	})

	it('система просит меньше движения — доля встаёт сразу', async () => {
		await reducedMotion('reduce')

		const ctrl = mount({ value: 40, orientation: 'vertical' })

		await transitionEvents()

		const runs = transitionRuns(range())

		ctrl.value = 80
		await transitionEvents()

		expect(runs).toEqual([])
		expect(filledUp()).toBeCloseTo(0.8, 2)
	})

	it('бег — снизу вверх: отрезок стоит у низа и идёт к верху', async () => {
		mount({ indeterminate: true, orientation: 'vertical' })
		await transitionEvents()

		expect(getComputedStyle(range()).visibility).toBe('hidden')
		expect(segment().bottom).toBe('0px')

		const [quarter, half, threeQuarters] = shiftsAt([0.25, 0.5, 0.75], 'y')

		// Ось экрана вниз: путь вверх — убывающий сдвиг
		expect(quarter).toBeGreaterThan(half)
		expect(half).toBeGreaterThan(threeQuarters)
		// Вдоль строки отрезок не ходит
		expect(shiftsAt([0.25, 0.5, 0.75], 'x')).toEqual([0, 0, 0])
	})

	it('в RTL бег тот же: направление письма вертикальную полосу не задевает', async () => {
		mount({ indeterminate: true, orientation: 'vertical' })
		await transitionEvents()

		const ltr = shiftsAt([0.25, 0.5, 0.75], 'y')

		cleanup()
		mount({ indeterminate: true, orientation: 'vertical' }, 'rtl')
		await transitionEvents()

		expect(segment().bottom).toBe('0px')
		expect(shiftsAt([0.25, 0.5, 0.75], 'y')).toEqual(ltr)
		expect(shiftsAt([0.25, 0.5, 0.75], 'x')).toEqual([0, 0, 0])
	})

	it('система просит меньше движения — бега нет, мерцает вся полоса', async () => {
		await reducedMotion('reduce')

		// Эмуляция действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

		mount({ indeterminate: true, orientation: 'vertical' })
		await transitionEvents()

		expect(Math.abs(Number.parseFloat(segment().height) - root().clientHeight)).toBeLessThan(
			EPSILON,
		)
		expect(segment().translate).toBe('none')
		expect(animatedProperties(runOf(root()))).toEqual(['opacity'])
	})
})

/**
 * Принудительные цвета (высокий контраст Windows): браузер заменил бы фоны
 * полосы системным цветом поверхности, и от неё не осталось бы ничего. Тема
 * отдаёт системные цвета — дорожке `GrayText`, заливке и бегущему отрезку
 * `Highlight`, как у кольца ProgressSpinner, — и правило режима не
 * проигрывает ни варианту, ни бегу. Отрезок раньше проигрывал: правило бега
 * специфичнее правила режима, и отрезок оставался цвета темы.
 */
describe('принудительные цвета', () => {
	it.each(SCHEMES)('%s: дорожка и заливка — системными цветами', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.theme = scheme

		mount({ value: 40, variant: 'positive' })
		await transitionEvents()

		// Режим действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(forced-colors: active)').matches).toBe(true)

		expect(backgroundOf(getComputedStyle(root()))).toEqual(pixel([systemColor('GrayText')]))
		expect(backgroundOf(getComputedStyle(range()))).toEqual(pixel([systemColor('Highlight')]))
	})

	it.each(SCHEMES)('%s: на бегу — бегущий отрезок системным цветом', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.theme = scheme

		mount({ indeterminate: true, variant: 'positive' })
		await transitionEvents()

		expect(backgroundOf(getComputedStyle(root()))).toEqual(pixel([systemColor('GrayText')]))
		expect(backgroundOf(segment())).toEqual(pixel([systemColor('Highlight')]))
	})
})
