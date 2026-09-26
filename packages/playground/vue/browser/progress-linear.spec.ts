/**
 * ProgressLinear в настоящем браузере: переход доли и бег — тема.
 *
 * Долю и наборы считает ядро (`core/__tests__/progress-linear.spec.ts`),
 * разметку — адаптер (`ui/vue/__tests__/progress-linear.spec.ts`). Здесь то,
 * чего jsdom не видит вовсе: он не считает стилей и не заводит ни переходов,
 * ни анимаций. Как полоса движется, решает тема
 * (`themes/oren/src/components/progress-linear/_progress-linear.scss`): доля
 * едет переходом, бег — сдвиг отрезка, зеркальный в RTL, а при просьбе
 * системы убрать движение доля встаёт сразу, и отрезок не бежит, а дышит.
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

import { reducedMotion } from './media'
import { settled, transitionEvents, transitionRuns } from './transitions'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление длины, px. */
const EPSILON = 0.5

/**
 * Полоса на странице шириной 400 px. Значение держит экземпляр ядра: через
 * него тест и меняет долю.
 */
function mount(props: Partial<IProgressLinearProps> = {}, dir: 'ltr' | 'rtl' = 'ltr') {
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

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const root = () => find('.s-progress-linear')
const range = () => find('.s-progress-linear__range')

/** Бегущий отрезок: его вычисленный стиль — у псевдоэлемента корня. */
const segment = () => getComputedStyle(root(), '::after')

/** Длина заливки долей дорожки. */
const filled = () => range().getBoundingClientRect().width / root().getBoundingClientRect().width

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

/** Анимация бега — у псевдоэлемента корня; нет её — тест падает здесь. */
function runOf(element: HTMLElement): CSSAnimation {
	const found = element
		.getAnimations({ subtree: true })
		.find(
			(animation) =>
				animation instanceof CSSAnimation &&
				animation.effect instanceof KeyframeEffect &&
				animation.effect.pseudoElement === '::after',
		)

	if (!(found instanceof CSSAnimation)) throw new Error('анимации бега нет')

	return found
}

/**
 * Сдвиг отрезка на долях круга бега — в процентах его длины, как их считает
 * браузер. Бег встаёт на паузу: коробки псевдоэлемента браузер не отдаёт, а
 * вычисленный сдвиг — отдаёт.
 */
function shiftsAt(progress: readonly number[]): number[] {
	const run = runOf(root())
	const duration = run.effect?.getTiming().duration

	if (typeof duration !== 'number') throw new Error('длительности бега числом нет')

	run.pause()

	return progress.map((share) => {
		run.currentTime = duration * share

		return Number.parseFloat(segment().translate)
	})
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(async () => {
	cleanup()
	await reducedMotion('no-preference')
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
	 * Пока доля неизвестна, переменной доли нет, и заливка под бегом уходит к
	 * нулю. Пришедшая доля растёт от начала дорожки, а не с места, где заливку
	 * оставили перед бегом.
	 */
	it('от бега к доле — заливка растёт от нуля', async () => {
		const ctrl = mount({ value: 25 })

		await transitionEvents()

		// Под бегом заливка уходит к нулю тем же переходом — дождаться его
		ctrl.value = null
		await transitionEvents()
		await settled(range())

		const starts = transitionStarts(range())

		ctrl.value = 60
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
	it('пока доля неизвестна, заливка спрятана, а отрезок идёт к концу строки', async () => {
		mount({ value: null })
		await transitionEvents()

		expect(getComputedStyle(range()).visibility).toBe('hidden')
		expect(segment().left).toBe('0px')

		const [quarter, half, threeQuarters] = shiftsAt([0.25, 0.5, 0.75])

		expect(quarter).toBeLessThan(half)
		expect(half).toBeLessThan(threeQuarters)
	})

	it('в RTL бег зеркальный: отрезок стоит справа и идёт влево', async () => {
		mount({ value: null })
		await transitionEvents()

		const ltr = shiftsAt([0.25, 0.5, 0.75])

		cleanup()
		mount({ value: null }, 'rtl')
		await transitionEvents()

		expect(segment().right).toBe('0px')
		expect(shiftsAt([0.25, 0.5, 0.75])).toEqual(ltr.map((shift) => -shift))
	})

	it('система просит меньше движения — отрезок во всю дорожку не бежит, а дышит', async () => {
		await reducedMotion('reduce')

		mount({ value: null })
		await transitionEvents()

		expect(segment().translate).toBe('none')
		expect(Math.abs(Number.parseFloat(segment().width) - root().offsetWidth)).toBeLessThan(
			EPSILON,
		)

		const { effect } = runOf(root())
		const opacities =
			effect instanceof KeyframeEffect
				? effect.getKeyframes().map((keyframe) => Number(keyframe.opacity))
				: []

		// Дышит, но до полной плотности не доходит: залитая до конца дорожка
		// читалась бы как «готово»
		expect(opacities.length).toBeGreaterThan(1)
		expect(Math.max(...opacities)).toBeLessThan(1)
		expect(Math.min(...opacities)).toBeLessThan(Math.max(...opacities))
	})
})
