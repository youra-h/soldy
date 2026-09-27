/**
 * ProgressSpinner в настоящем браузере: диаметр, переход доли, бег и
 * принудительные цвета — тема.
 *
 * Долю и наборы считает ядро (`core/__tests__/progress-spinner.spec.ts`),
 * разметку — адаптер (`ui/vue/__tests__/progress-spinner.spec.ts`). Здесь то,
 * чего jsdom не видит вовсе: он не считает ни стилей, ни раскладки и не
 * заводит ни переходов, ни анимаций. Как кольцо выглядит и движется, решает
 * тема (`themes/oren/src/components/progress-spinner/_progress-spinner.scss`):
 * диаметр — шкала Spinner, доля — длина штриха дуги и едет переходом, бег —
 * поворот всего рисунка по часовой, в RTL тот же. При просьбе системы убрать
 * движение доля встаёт сразу, а бег тот же. В принудительных цветах штрихи
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
import { ProgressSpinner, Spinner } from '@soldy-ui/vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'

import { find, pixel } from './colors'
import { forcedColors, reducedMotion } from './media'
import { settled, transitionEvents, transitionRuns } from './transitions'

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

/**
 * Системный цвет в текущем режиме, как его разрешает браузер. Проба не
 * подчиняется режиму (`forced-color-adjust: none`): иначе браузер заменил бы и
 * её цвет.
 */
function systemColor(keyword: 'Highlight' | 'GrayText'): string {
	const probe = document.createElement('span')

	probe.style.setProperty('forced-color-adjust', 'none')
	probe.style.color = keyword
	document.body.append(probe)

	const color = getComputedStyle(probe).color

	probe.remove()

	return color
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
 * Диаметр — шкала Spinner: кольцо, вставшее на место Spinner того же
 * размера, не сдвигает текст рядом.
 *
 * Меряется коробка раскладки (`offsetWidth`), а не `getBoundingClientRect()`:
 * Spinner крутится целиком, и рамка повёрнутого квадрата шире его самого.
 */
describe('диаметр', () => {
	it.each(COMPONENT_SIZES)('размер %s: как у Spinner того же размера', async (size) => {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'padding: 24px' }, [
						h(Spinner, { size }),
						h(ProgressSpinner, { size }),
					]),
			}),
		)
		await transitionEvents()

		const spinner = find('.s-spinner')
		const box = root()

		expect(box.offsetWidth).toBeGreaterThan(0)
		expect(box.offsetWidth).toBe(spinner.offsetWidth)
		expect(box.offsetHeight).toBe(spinner.offsetHeight)
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
	 * Бег одинаков при любых настройках системы — решение владельца, как у
	 * линии и выезда Drawer: у неизвестной доли движение и есть сообщение
	 * «работа идёт», а Spinner тоже крутится при любых настройках. Сторож
	 * решения: без него бег снова спрятали бы под `prefers-reduced-motion`.
	 */
	it('система просит меньше движения — рисунок всё равно крутится', async () => {
		mount({ indeterminate: true })
		await transitionEvents()

		const angles = anglesAt([0.25, 0.5, 0.75])

		cleanup()
		await reducedMotion('reduce')

		// Эмуляция действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)

		mount({ indeterminate: true })
		await transitionEvents()

		expect(runOf().animationName).toBe(RUN)
		expect(getComputedStyle(runner()).visibility).toBe('visible')
		expect(anglesAt([0.25, 0.5, 0.75])).toEqual(angles)
	})
})

/**
 * Принудительные цвета (высокий контраст Windows): штрихи SVG браузер не
 * перекрашивает, и кольцо осталось бы в цветах темы, чужих палитре
 * пользователя. Тема отдаёт штрихам системные цвета — дорожке `GrayText`,
 * дугам `Highlight`, — и правило режима не проигрывает ни варианту, ни бегу.
 */
describe('принудительные цвета', () => {
	it.each(SCHEMES)('%s: дорожка и дуга доли — системными цветами', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.theme = scheme

		mount({ value: 40, variant: 'positive' })
		await transitionEvents()

		// Режим действует — иначе сторож проверял бы обычный режим
		expect(matchMedia('(forced-colors: active)').matches).toBe(true)

		expect(strokeOf(track())).toEqual(pixel([systemColor('GrayText')]))
		expect(strokeOf(range())).toEqual(pixel([systemColor('Highlight')]))
	})

	it.each(SCHEMES)('%s: на бегу — бегущая дуга системным цветом', async (scheme) => {
		await forcedColors('active')
		document.documentElement.dataset.theme = scheme

		mount({ indeterminate: true })
		await transitionEvents()

		expect(strokeOf(track())).toEqual(pixel([systemColor('GrayText')]))
		expect(strokeOf(runner())).toEqual(pixel([systemColor('Highlight')]))
	})
})
