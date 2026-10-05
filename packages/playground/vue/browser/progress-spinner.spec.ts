/**
 * ProgressSpinner в настоящем браузере: диаметр, переход доли, бег и
 * принудительные цвета — тема.
 *
 * Долю и наборы считает ядро (`core/__tests__/progress-spinner.spec.ts`),
 * разметку — адаптер (`ui/vue/__tests__/progress-spinner.spec.ts`). Здесь то,
 * чего jsdom не видит вовсе: он не считает ни стилей, ни раскладки и не
 * заводит ни переходов, ни анимаций. Как кольцо выглядит и движется, решает
 * тема (`themes/oren/src/components/progress-spinner/_progress-spinner.scss`):
 * диаметр — шкала размеров, доля — длина штриха дуги и едет переходом, бег —
 * поворот всего рисунка по часовой, в RTL тот же. Без движения доля встаёт
 * сразу, а вместо бега мерцает всё кольцо. В принудительных цветах штрихи
 * берут системные цвета: сам браузер SVG не перекрашивает.
 *
 * Переходы ловит слушатель, повешенный до действия, а не снимок после него:
 * переход короткий, и `getAnimations()` после действия мог бы его уже не
 * застать. Слушатель висит на корне: события перехода всплывают от дуги.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import { TProgressSpinner } from '@soldy-ui/core'
import type { IProgressProps } from '@soldy-ui/core'
import { ProgressSpinner } from '@soldy-ui/vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'

import { find, pixel, systemColor } from './colors'
import { forcedColors, reducedMotion } from './media'
import { animatedProperties, settled, transitionEvents, transitionRuns } from './transitions'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление длины, px. */
const EPSILON = 0.5

/** Имя кадров бега в теме. */
const RUN = 's-progress-spinner-run'

/** Схемы темы: палитру принудительных цветов выбирает браузер, но проверяем обе. */
const SCHEMES = ['oren', 'oren-dark'] as const

/**
 * Кольцо на странице. Значение держит экземпляр ядра: через него тест и
 * меняет долю и флаг.
 */
function mount(props: Partial<IProgressProps> = {}, dir: 'ltr' | 'rtl' = 'ltr') {
	const ctrl = new TProgressSpinner(props)

	render(
		defineComponent({
			render: () => h('div', { dir, style: 'padding: 24px' }, [h(ProgressSpinner, { ctrl })]),
		}),
	)

	return ctrl
}

/** Часть рисунка по селектору; нет её — тест падает здесь, а не на чтении свойства. */
function part(selector: string): SVGElement {
	const element = document.querySelector(selector)

	if (!(element instanceof SVGElement)) throw new Error(`${selector}: SVG-узла нет`)

	return element
}

const root = () => find('.s-progress-spinner')
const ring = () => part('.s-progress-spinner__ring')
const track = () => part('.s-progress-spinner__track')
const range = () => part('.s-progress-spinner__range')
const runner = () => part('.s-progress-spinner__runner')

/**
 * Длина штриха в долях окружности — первое число `stroke-dasharray`, как его
 * записал браузер (`0.4px, 0.6px`): у дуг `pathLength="1"`.
 */
const dashOf = (dasharray: unknown): number => Number.parseFloat(String(dasharray))

/** Сколько кольца закрашено дугой доли. */
const filled = () => dashOf(getComputedStyle(range()).strokeDasharray)

/**
 * С какой длины штрих дуги пошёл переходом — по первому кадру перехода,
 * который браузер завёл. Кадр читается в слушателе `transitionrun`, пока
 * переход ещё идёт.
 */
function dashStarts(element: SVGElement): string[] {
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

		starts.push(`${propertyName} ${dashOf(first?.strokeDasharray)}`)
	})

	return starts
}

/** Анимация бега — у рисунка; нет её — тест падает здесь. */
function runOf(): CSSAnimation {
	const found = ring()
		.getAnimations()
		.find((animation) => animation instanceof CSSAnimation)

	if (!(found instanceof CSSAnimation)) throw new Error('анимации бега нет')

	return found
}

/**
 * Поворот рисунка на долях круга бега, в градусах: свойство `rotate`, которое
 * ведут кадры бега. Бег встаёт на паузу — поворот читается на заданном шаге
 * круга, а не там, где его застал тест.
 */
function anglesAt(progress: readonly number[]): number[] {
	const run = runOf()
	const duration = run.effect?.getTiming().duration

	if (typeof duration !== 'number') throw new Error('длительности бега числом нет')

	run.pause()

	return progress.map((share) => {
		run.currentTime = duration * share

		return Number.parseFloat(getComputedStyle(ring()).rotate)
	})
}

/** Цвет штриха части — байтами sRGB: запись браузера сравнивать нельзя. */
const strokeOf = (element: SVGElement) => pixel([getComputedStyle(element).stroke])

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
	await forcedColors('none')
})

/**
 * Диаметр — шкала размеров темы: на каждом размере коробка кольца квадратная,
 * и чем больше размер, тем она больше. Чисел шкалы тест не знает: это карта
 * темы, и вторая её запись здесь разошлась бы с первой.
 *
 * Меряется коробка раскладки (`offsetWidth`, `offsetHeight`) — место, которое
 * кольцо занимает в строке.
 */
describe('диаметр', () => {
	it.each(COMPONENT_SIZES)('размер %s: коробка квадратная', async (size) => {
		mount({ size })
		await transitionEvents()

		const box = root()

		expect(box.offsetWidth).toBeGreaterThan(0)
		expect(box.offsetHeight).toBe(box.offsetWidth)
	})

	it('коробка растёт по шкале размеров', async () => {
		render(
			defineComponent({
				render: () =>
					h(
						'div',
						{ style: 'padding: 24px' },
						COMPONENT_SIZES.map((size) => h(ProgressSpinner, { key: size, size })),
					),
			}),
		)
		await transitionEvents()

		const widths = COMPONENT_SIZES.map(
			(size) => find(`.s-progress-spinner--size-${size}`).offsetWidth,
		)

		widths.slice(1).forEach((width, index) => {
			const step = `${COMPONENT_SIZES[index]} → ${COMPONENT_SIZES[index + 1]}`

			expect(width, step).toBeGreaterThan(widths[index])
		})
	})

	it('рисунок — во всю коробку кольца', async () => {
		mount({ value: 40, size: '2xl' })
		await transitionEvents()

		const box = root().getBoundingClientRect()
		const picture = ring().getBoundingClientRect()

		expect(Math.abs(picture.width - box.width)).toBeLessThan(EPSILON)
		expect(Math.abs(picture.height - box.height)).toBeLessThan(EPSILON)
	})
})

describe('доля', () => {
	it('монтирование на доле — дуга сразу на месте, без перехода', async () => {
		mount({ value: 40 })

		// Слушатель — до первого кадра: переход на монтировании он бы застал
		const runs = transitionRuns(root())

		await transitionEvents()

		expect(runs).toEqual([])
		expect(filled()).toBeCloseTo(0.4, 5)
	})

	it('смена доли — переходом длины штриха от прежней', async () => {
		const ctrl = mount({ value: 40 })

		await transitionEvents()

		const starts = dashStarts(range())

		ctrl.value = 80
		await transitionEvents()

		expect(starts).toEqual(['stroke-dasharray 0.4'])
	})

	it('полное кольцо — промежутка нет', async () => {
		mount({ value: 100 })
		await transitionEvents()

		const [dash, gap] = getComputedStyle(range())
			.strokeDasharray.split(',')
			.map((value) => Number.parseFloat(value))

		expect(dash).toBe(1)
		expect(gap).toBe(0)
	})

	/**
	 * Пока кольцо бежит, переменной доли нет, и дуга под бегом уходит к нулю.
	 * Доля, вернувшаяся со снятием флага, растёт от начала кольца, а не с
	 * места, где дугу оставили перед бегом.
	 */
	it('от бега к доле — дуга растёт от нуля', async () => {
		const ctrl = mount({ value: 25 })

		await transitionEvents()

		// Под бегом дуга уходит к нулю тем же переходом — дождаться его
		ctrl.indeterminate = true
		await transitionEvents()
		await settled(range())

		const starts = dashStarts(range())

		// Значение, записанное во время бега, ждёт снятия флага
		ctrl.value = 60
		ctrl.indeterminate = false
		await transitionEvents()

		expect(starts).toEqual(['stroke-dasharray 0'])
	})

	it('система просит меньше движения — доля встаёт сразу', async () => {
		await reducedMotion('reduce')

		const ctrl = mount({ value: 40 })

		await transitionEvents()

		const runs = transitionRuns(root())

		ctrl.value = 80
		await transitionEvents()

		expect(runs).toEqual([])
		expect(filled()).toBeCloseTo(0.8, 5)
	})
})

describe('бег', () => {
	it('без флага рисунок стоит: бегущей дуги не видно, дуга доли видна', async () => {
		mount({ value: 40 })
		await transitionEvents()

		expect(ring().getAnimations()).toEqual([])
		expect(getComputedStyle(runner()).visibility).toBe('hidden')
		expect(getComputedStyle(range()).visibility).toBe('visible')
	})

	it('флаг включает бег поверх доли: дуга доли спрятана, рисунок крутится по часовой', async () => {
		const ctrl = mount({ value: 40 })

		await transitionEvents()

		ctrl.indeterminate = true
		await transitionEvents()

		expect(getComputedStyle(range()).visibility).toBe('hidden')
		expect(getComputedStyle(runner()).visibility).toBe('visible')
		expect(runOf().animationName).toBe(RUN)

		// Угол растёт — поворот по часовой
		const [quarter, half, threeQuarters] = anglesAt([0.25, 0.5, 0.75])

		expect(quarter).toBeGreaterThan(0)
		expect(quarter).toBeLessThan(half)
		expect(half).toBeLessThan(threeQuarters)
		expect(threeQuarters).toBeLessThan(360)
	})

	it('флаг снят — бег остановлен', async () => {
		const ctrl = mount({ indeterminate: true })

		await transitionEvents()

		expect(runOf().animationName).toBe(RUN)

		ctrl.indeterminate = false
		await transitionEvents()

		expect(ring().getAnimations()).toEqual([])
	})

	it('в RTL бег тот же: кольцо не зеркалится', async () => {
		mount({ indeterminate: true })
		await transitionEvents()

		const ltr = anglesAt([0.25, 0.5, 0.75])

		cleanup()
		mount({ indeterminate: true }, 'rtl')
		await transitionEvents()

		expect(anglesAt([0.25, 0.5, 0.75])).toEqual(ltr)
	})

	/**
	 * Бег — движение, и без него (здесь — по просьбе системы) рисунок стоит.
	 * Полное кольцо, которое стоит, читалось бы готовой работой, поэтому
	 * бегущая дуга без движения — всё кольцо сплошным штрихом, и она мерцает
	 * прозрачностью: кадры ведут одну прозрачность. Режим приложения поверх
	 * системы — `browser/motion-mode.spec.ts`.
	 */
	it('система просит меньше движения — рисунок стоит, мерцает всё кольцо', async () => {
		await reducedMotion('reduce')

		// Эмуляция действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

		mount({ indeterminate: true })
		await transitionEvents()

		expect(ring().getAnimations()).toEqual([])
		expect(getComputedStyle(runner()).visibility).toBe('visible')

		const [dash, gap] = getComputedStyle(runner())
			.strokeDasharray.split(',')
			.map((value) => Number.parseFloat(value))

		expect(dash).toBe(1)
		expect(gap).toBe(0)

		const pulse = runner()
			.getAnimations()
			.find((animation) => animation instanceof CSSAnimation)

		if (!pulse) throw new Error('мерцания нет')

		expect(animatedProperties(pulse)).toEqual(['opacity'])
	})
})

/**
 * Принудительные цвета (высокий контраст Windows): штрихи SVG браузер не
 * перекрашивает, и кольцо осталось бы в цветах темы, чужих палитре
 * пользователя. Тема отдаёт штрихам системные цвета — дугам `Highlight`, а
 * дорожке цвет текста при вдвое меньшей толщине, — и правило режима не
 * проигрывает ни варианту, ни бегу. Дорожка была `GrayText` той же толщины, и
 * рядом с `Highlight` во многих палитрах почти того же цвета: долю было не
 * разглядеть.
 */
describe('принудительные цвета', () => {
	/** Дорожка — цвета текста и вдвое тоньше дуги. */
	const expectThinTrack = () => {
		expect(strokeOf(track()), 'цвет дорожки').toEqual(pixel([systemColor('CanvasText')]))
		expect(
			Number.parseFloat(getComputedStyle(track()).strokeWidth) * 2,
			'толщина дорожки',
		).toBe(Number.parseFloat(getComputedStyle(range()).strokeWidth))
	}

	it.each(SCHEMES)('%s: дорожка и дуга доли — системными цветами', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.theme = scheme

		mount({ value: 40, variant: 'positive' })
		await transitionEvents()

		// Режим действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(forced-colors: active)').matches).toBe(true)

		expectThinTrack()
		expect(strokeOf(range())).toEqual(pixel([systemColor('Highlight')]))
	})

	it.each(SCHEMES)('%s: на бегу — бегущая дуга системным цветом', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.theme = scheme

		mount({ indeterminate: true })
		await transitionEvents()

		expectThinTrack()
		expect(strokeOf(runner())).toEqual(pixel([systemColor('Highlight')]))
	})
})
