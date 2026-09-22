import { describe, it, expect } from 'vitest'
import { resolveEdges } from '@soldy-ui/plugins'

/**
 * Края ленты — счёт без DOM.
 *
 * Здесь проверяется ровно то, что в браузере даётся дороже всего: дробные
 * ширины, ещё не разложенный вьюпорт и RTL, где браузер отдаёт отрицательное
 * положение. Настоящая раскладка — `playground/vue/browser/scroller.spec.ts`.
 */

describe('лента не разложена', () => {
	/** До первой раскладки все три числа нули — это не «листать некуда». */
	it('нулевой бокс не включает ни одной кнопки', () => {
		expect(resolveEdges({ scrollLeft: 0, clientWidth: 0, scrollWidth: 0 })).toEqual({
			canPrev: false,
			canNext: false,
		})
	})

	it('нулевая видимая ширина при известном содержимом тоже молчит', () => {
		expect(resolveEdges({ scrollLeft: 0, clientWidth: 0, scrollWidth: 800 })).toEqual({
			canPrev: false,
			canNext: false,
		})
	})
})

describe('лента в LTR', () => {
	it('содержимое помещается — листать некуда', () => {
		expect(resolveEdges({ scrollLeft: 0, clientWidth: 400, scrollWidth: 400 })).toEqual({
			canPrev: false,
			canNext: false,
		})
	})

	it('в начале листается только вперёд', () => {
		expect(resolveEdges({ scrollLeft: 0, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: false,
			canNext: true,
		})
	})

	it('в середине листается в обе стороны', () => {
		expect(resolveEdges({ scrollLeft: 400, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: true,
			canNext: true,
		})
	})

	it('в конце листается только назад', () => {
		expect(resolveEdges({ scrollLeft: 500, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: true,
			canNext: false,
		})
	})
})

describe('допуск в пиксель', () => {
	/**
	 * `clientWidth` и `scrollWidth` браузер округляет, `scrollLeft` отдаёт
	 * дробным: без допуска кнопка «вперёд» на самом краю не гасла бы.
	 */
	it('недоехавший до конца пиксель считается концом', () => {
		expect(resolveEdges({ scrollLeft: 499.6, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: true,
			canNext: false,
		})
	})

	it('пиксель от начала — ещё начало', () => {
		expect(resolveEdges({ scrollLeft: 0.8, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: false,
			canNext: true,
		})
	})

	it('два пикселя от начала — уже не начало', () => {
		expect(resolveEdges({ scrollLeft: 2, clientWidth: 400, scrollWidth: 900 }).canPrev).toBe(
			true,
		)
	})
})

describe('лента в RTL', () => {
	/**
	 * Начало строки в RTL — правый край, и лента уезжает от него в минус.
	 * Значим модуль: он и есть расстояние от логического начала.
	 */
	it('отрицательное положение читается как расстояние от начала', () => {
		expect(resolveEdges({ scrollLeft: -400, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: true,
			canNext: true,
		})
	})

	it('в начале строки листается только вперёд', () => {
		expect(resolveEdges({ scrollLeft: -0, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: false,
			canNext: true,
		})
	})

	it('в конце строки листается только назад', () => {
		expect(resolveEdges({ scrollLeft: -500, clientWidth: 400, scrollWidth: 900 })).toEqual({
			canPrev: true,
			canNext: false,
		})
	})
})
