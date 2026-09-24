import { describe, it, expect } from 'vitest'
import { createScale, TListScale, TStepScale } from '@soldy-ui/core'

/**
 * Шкала хода — чистая математика перетаскивания: границы, шаг числом или
 * списком, перевод между значением и долей хода. Вид выбирает фабрика по
 * форме шага; в операциях веток по виду нет.
 */

describe('createScale: вид — по форме шага', () => {
	it('шаг числом — ровная сетка, списком — список', () => {
		expect(createScale({ min: 0, max: 10, step: 1 })).toBeInstanceOf(TStepScale)
		expect(createScale({ min: 0, max: 10, step: [1, 5] })).toBeInstanceOf(TListScale)
	})

	it('граница не числом: min — ноль, max — min', () => {
		const scale = createScale({ min: Number.NaN, max: Number.NaN, step: 1 })

		expect([scale.min, scale.max]).toEqual([0, 0])
		expect(scale.snap(40)).toBe(0)
	})

	it('max меньше min — ход схлопывается в min', () => {
		const scale = createScale({ min: 50, max: 10, step: 1 })

		expect(scale.max).toBe(50)
		expect([scale.first, scale.last]).toEqual([50, 50])
		expect(scale.fraction(50)).toBe(0)
	})
})

describe('шаг числом', () => {
	it('snap — к ближайшему узлу от min; поровну — к большему', () => {
		const scale = createScale({ min: 0, max: 100, step: 10 })

		expect(scale.snap(14)).toBe(10)
		expect(scale.snap(16)).toBe(20)
		expect(scale.snap(15)).toBe(20)
		expect(scale.snap(-40)).toBe(0)
		expect(scale.snap(400)).toBe(100)
	})

	it('сетка идёт от min, а не от нуля', () => {
		const scale = createScale({ min: 3, max: 23, step: 5 })

		expect(scale.points).toEqual([3, 8, 13, 18, 23])
		expect(scale.snap(10)).toBe(8)
	})

	it('точность шага: 0.1 + 0.2 — ровно 0.3', () => {
		const scale = createScale({ min: 0, max: 1, step: 0.1 })

		expect(scale.shift(0.1, 2)).toBe(0.3)
		expect(scale.snap(0.30000000000000004)).toBe(0.3)
		expect(scale.points).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1])
	})

	it('шаг в экспоненциальной записи тоже точен', () => {
		const scale = createScale({ min: 0, max: 0.000001, step: 1e-7 })

		expect(scale.shift(0, 3)).toBe(3e-7)
		expect(scale.last).toBe(0.000001)
	})

	it('max вне сетки недостижим: последний узел — не дальше max', () => {
		const scale = createScale({ min: 0, max: 10, step: 3 })

		expect(scale.last).toBe(9)
		expect(scale.snap(10)).toBe(9)
		expect(scale.valueAt(1)).toBe(9)
		expect(scale.points).toEqual([0, 3, 6, 9])
	})

	it('неверный шаг — как у нативного поля, 1', () => {
		for (const step of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
			expect(createScale({ min: 0, max: 3, step }).points).toEqual([0, 1, 2, 3])
		}
	})

	it('interval — шаг сетки', () => {
		expect(createScale({ min: 0, max: 10, step: 2.5 }).interval).toBe(2.5)
	})

	it('shift — на n узлов от ближайшего, за краем — край; дробное число шагов округляется', () => {
		const scale = createScale({ min: 0, max: 100, step: 5 })

		expect(scale.shift(50, 1)).toBe(55)
		expect(scale.shift(50, -3)).toBe(35)
		expect(scale.shift(52, 1)).toBe(55)
		expect(scale.shift(95, 10)).toBe(100)
		expect(scale.shift(5, -10)).toBe(0)
		expect(scale.shift(50, 1.6)).toBe(60)
		expect(scale.shift(50, Number.NaN)).toBe(50)
	})

	it('snap(NaN) — начало хода', () => {
		expect(createScale({ min: 10, max: 20, step: 1 }).snap(Number.NaN)).toBe(10)
	})
})

describe('шаг списком', () => {
	it('достижимы только элементы списка; вне хода — отброшены, повторы схлопнуты, порядок — по возрастанию', () => {
		const scale = createScale({ min: 0, max: 100, step: [50, 1, 200, 5, 5, -3, 20] })

		expect(scale.points).toEqual([1, 5, 20, 50])
		expect([scale.first, scale.last]).toEqual([1, 50])
	})

	it('snap — к ближайшему элементу; поровну — к большему', () => {
		const scale = createScale({ min: 0, max: 100, step: [0, 10, 50, 100] })

		expect(scale.snap(4)).toBe(0)
		expect(scale.snap(6)).toBe(10)
		expect(scale.snap(30)).toBe(50)
		expect(scale.snap(29)).toBe(10)
	})

	it('shift — к соседнему элементу, а не на число', () => {
		const scale = createScale({ min: 0, max: 100, step: [1, 2, 5, 10, 20, 50] })

		expect(scale.shift(5, 1)).toBe(10)
		expect(scale.shift(5, -2)).toBe(1)
		expect(scale.shift(20, 5)).toBe(50)
	})

	it('ровного шага нет: interval — undefined', () => {
		expect(createScale({ min: 0, max: 10, step: [1, 2] }).interval).toBeUndefined()
	})

	it('пустой список — достижимо одно min', () => {
		const scale = createScale({ min: 5, max: 10, step: [] })

		expect(scale.points).toEqual([5])
		expect(scale.snap(9)).toBe(5)
	})
})

describe('доля хода ↔ значение — линейно по значению при любом шаге', () => {
	it('fraction: 0 — min, 1 — max; за границами — граница', () => {
		const scale = createScale({ min: -50, max: 50, step: 1 })

		expect(scale.fraction(-50)).toBe(0)
		expect(scale.fraction(0)).toBe(0.5)
		expect(scale.fraction(50)).toBe(1)
		expect(scale.fraction(80)).toBe(1)
		expect(scale.fraction(-80)).toBe(0)
	})

	it('valueAt — ближайшее достижимое к точке на линейке', () => {
		const grid = createScale({ min: 0, max: 200, step: 10 })
		const list = createScale({ min: 0, max: 100, step: [0, 10, 100] })

		expect(grid.valueAt(0.26)).toBe(50)
		expect(grid.valueAt(-1)).toBe(0)
		expect(grid.valueAt(2)).toBe(200)
		// Линейка, а не номер элемента: середина хода — 50, ближе всего к 10 или 100
		expect(list.valueAt(0.5)).toBe(10)
		expect(list.valueAt(0.6)).toBe(100)
	})

	it('у схлопнутого хода доля — ноль, у доли NaN — начало', () => {
		expect(createScale({ min: 5, max: 5, step: 1 }).fraction(5)).toBe(0)
		expect(createScale({ min: 0, max: 10, step: 1 }).valueAt(Number.NaN)).toBe(0)
	})
})
