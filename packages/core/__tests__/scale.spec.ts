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

	it('бесконечность с чужой стороны — не граница: заменяет соседняя, как NaN', () => {
		const scale = createScale({ min: Infinity, max: -Infinity, step: 1 })

		expect([scale.min, scale.max]).toEqual([0, 0])
	})
})

/**
 * Открытая сторона — бесконечность на своей стороне: поле числа без `min` и
 * `max`. Ход с неё не кончается, сетка — от `min`, без него — от нуля, как у
 * нативного поля; меток у бесконечной сетки нет.
 */
describe('открытые стороны', () => {
	it('без границ: края — бесконечности, сетка — от нуля, меток нет', () => {
		const scale = createScale({ min: -Infinity, max: Infinity, step: 2 })

		expect([scale.min, scale.max]).toEqual([-Infinity, Infinity])
		expect([scale.first, scale.last]).toEqual([-Infinity, Infinity])
		expect(scale.points).toEqual([])
		expect(scale.snap(3.4)).toBe(4)
		expect(scale.snap(-5)).toBe(-4)
		expect(scale.shift(1000, 3)).toBe(1006)
		expect(scale.shift(-1000, -3)).toBe(-1006)
	})

	it('только min: сетка от него, вверх без края', () => {
		const scale = createScale({ min: 0.5, max: Infinity, step: 1 })

		expect([scale.first, scale.last]).toEqual([0.5, Infinity])
		expect(scale.snap(-10)).toBe(0.5)
		expect(scale.snap(7.4)).toBe(7.5)
		expect(scale.shift(0.5, -1)).toBe(0.5)
		expect(scale.shift(100.5, 1)).toBe(101.5)
	})

	it('только max: сетка от нуля, последний узел — не дальше max', () => {
		const scale = createScale({ min: -Infinity, max: 10, step: 3 })

		expect([scale.first, scale.last]).toEqual([-Infinity, 9])
		expect(scale.snap(10)).toBe(9)
		expect(scale.snap(-4)).toBe(-3)
		expect(scale.shift(9, 1)).toBe(9)
		expect(scale.shift(-30, -1)).toBe(-33)
	})

	it('бесконечное значение на открытой стороне — край', () => {
		const scale = createScale({ min: -Infinity, max: Infinity, step: 1 })

		expect(scale.snap(Infinity)).toBe(Infinity)
		expect(scale.shift(-Infinity, 1)).toBe(-Infinity)
	})

	it('доля у открытой шкалы — начало, а не NaN', () => {
		const scale = createScale({ min: 0, max: Infinity, step: 1 })

		expect(scale.fraction(50)).toBe(0)
	})
})

/**
 * Закрытая шкала — та, что у ползунка и оценки: с открытыми сторонами её
 * поведение не сменилось. Значения у них всегда на сетке — итог геттера
 * приведён к шагу, — и сдвиг с узла идёт на число узлов, как раньше.
 */
describe('закрытая шкала — как у ползунка', () => {
	it('с узла сетки — на count узлов, за краем — край', () => {
		const scale = createScale({ min: 0, max: 100, step: 10 })

		expect(scale.shift(50, 2)).toBe(70)
		expect(scale.shift(50, -2)).toBe(30)
		expect(scale.shift(100, 1)).toBe(100)
		expect(scale.first).toBe(0)
		expect(scale.points).toHaveLength(11)
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

	it('shift — на n узлов с узла, за краем — край; дробное число шагов округляется', () => {
		const scale = createScale({ min: 0, max: 100, step: 5 })

		expect(scale.shift(50, 1)).toBe(55)
		expect(scale.shift(50, -3)).toBe(35)
		expect(scale.shift(95, 10)).toBe(100)
		expect(scale.shift(5, -10)).toBe(0)
		expect(scale.shift(50, 1.6)).toBe(60)
		expect(scale.shift(50, Number.NaN)).toBe(50)
	})

	it('shift вне сетки — первый шаг к узлу со стороны сдвига, как у нативного поля', () => {
		const scale = createScale({ min: 0, max: 10, step: 1 })

		expect(scale.shift(2.5, 1)).toBe(3)
		expect(scale.shift(2.5, -1)).toBe(2)
		expect(scale.shift(2.2, 1)).toBe(3)
		expect(scale.shift(2.8, -1)).toBe(2)
		expect(scale.shift(2.5, 3)).toBe(5)
		expect(scale.shift(2.5, -3)).toBe(0)
		// Без шагов — ближайший узел, как snap
		expect(scale.shift(2.4, 0)).toBe(2)
	})

	it('shift за краем — к краю: со значения выше max вниз — последний узел', () => {
		const scale = createScale({ min: 0, max: 10, step: 3 })

		expect(scale.shift(10, -1)).toBe(9)
		expect(scale.shift(-5, 1)).toBe(0)
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

	it('shift вне списка — первый шаг к элементу со стороны сдвига', () => {
		const scale = createScale({ min: 0, max: 100, step: [1, 2, 5, 10] })

		expect(scale.shift(3, 1)).toBe(5)
		expect(scale.shift(3, -1)).toBe(2)
		expect(scale.shift(4, -1)).toBe(2)
	})

	it('открытые стороны список не трогают: точки — сам список', () => {
		const scale = createScale({ min: -Infinity, max: Infinity, step: [-5, 0, 5] })

		expect(scale.points).toEqual([-5, 0, 5])
		expect([scale.first, scale.last]).toEqual([-5, 5])
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
