/**
 * Стратегии щелчка — чистые функции доли: куда встала бы ручка без щелчка →
 * куда ей встать, и куда её довести, когда отпустили.
 *
 * DOM здесь нет: доли и радиус уже переведены плагином. Как плагин переводит
 * указатель и выбирает стратегию по режиму владельца, проверяет
 * `slide-pointer.plugin.spec.ts`, настоящий ввод —
 * `playground/vue/browser/slider.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import {
	THoldSnapStrategy,
	TMagnetSnapStrategy,
	TNoneSnapStrategy,
	TPlateauSnapStrategy,
	TSettleSnapStrategy,
} from '../src/custom/slide/pointer/strategies'
import type {
	ISlideSnapStrategy,
	TSlideSnapContext,
	TSlideSnapStrategyCtor,
} from '../src/custom/slide/pointer/strategies'

/** Три метки, радиус — 0.04 хода, жест начат у начала хода. */
function create(
	Strategy: TSlideSnapStrategyCtor,
	context: Partial<TSlideSnapContext> = {},
): ISlideSnapStrategy {
	return new Strategy({
		points: [0.2, 0.5, 0.8],
		radius: 0.04,
		anchor: 0,
		holdDelay: 100,
		...context,
	})
}

/** Куда встаёт ручка на каждой из долей `targets` — одним жестом, без времени. */
const trace = (strategy: ISlideSnapStrategy, targets: readonly number[]) =>
	targets.map((target) => strategy.follow(target, 0))

describe('none — щелчка нет', () => {
	it('ручка идёт за указателем, отпущенная остаётся, ждать нечего', () => {
		const strategy = create(TNoneSnapStrategy)

		expect(trace(strategy, [0.19, 0.2, 0.49, 0.5, 1])).toEqual([0.19, 0.2, 0.49, 0.5, 1])
		expect(strategy.release(0.49)).toBeUndefined()
		expect(strategy.wakeAt).toBeUndefined()
	})
})

describe('magnet — притяжение', () => {
	it('в радиусе метки ручка на ней, за радиусом — за указателем', () => {
		const strategy = create(TMagnetSnapStrategy)

		expect(trace(strategy, [0.47, 0.53, 0.2, 0.45, 0.55, 0.35])).toEqual([
			0.5, 0.5, 0.2, 0.45, 0.55, 0.35,
		])
	})

	it('поровну от двух меток — к меньшей', () => {
		const strategy = create(TMagnetSnapStrategy, { points: [0.25, 0.75], radius: 0.5 })

		expect(strategy.follow(0.5, 0)).toBe(0.25)
		expect(strategy.follow(0.625, 0)).toBe(0.75)
	})

	it('отпущенную не доводит: она уже на метке или вне радиуса', () => {
		expect(create(TMagnetSnapStrategy).release(0.47)).toBeUndefined()
	})

	it('без меток и с нулевым радиусом притягивать нечему', () => {
		expect(create(TMagnetSnapStrategy, { points: [] }).follow(0.49, 0)).toBe(0.49)
		expect(create(TMagnetSnapStrategy, { radius: 0 }).follow(0.49, 0)).toBe(0.49)
		expect(create(TMagnetSnapStrategy, { radius: 0 }).follow(0.5, 0)).toBe(0.5)
	})

	it('радиус меньше нуля или не число — ноль', () => {
		expect(create(TMagnetSnapStrategy, { radius: -1 }).follow(0.49, 0)).toBe(0.49)
		expect(create(TMagnetSnapStrategy, { radius: Number.NaN }).follow(0.49, 0)).toBe(0.49)
	})
})

describe('plateau — плато', () => {
	/** Одна метка посередине, плато — по 0.1 хода с каждой стороны. */
	const middle = (anchor = 0) =>
		create(TPlateauSnapStrategy, { points: [0.5], radius: 0.1, anchor })

	it('на плато ручка стоит на метке', () => {
		expect(trace(middle(), [0.4, 0.45, 0.5, 0.55, 0.6])).toEqual([0.5, 0.5, 0.5, 0.5, 0.5])
	})

	it('промежуток сжат: ручка идёт быстрее указателя и встречает плато на метке', () => {
		const strategy = middle()

		expect(strategy.follow(0.2, 0)).toBeCloseTo(0.25)
		expect(strategy.follow(0.8, 0)).toBeCloseTo(0.75)
	})

	it('края хода — края: недостижимых значений нет, за краем — край', () => {
		const strategy = middle()

		expect(strategy.follow(0, 0)).toBe(0)
		expect(strategy.follow(1, 0)).toBeCloseTo(1)
		expect(strategy.follow(-0.2, 0)).toBe(0)
		expect(strategy.follow(1.3, 0)).toBeCloseTo(1)
	})

	/**
	 * Ломаная непрерывна и не убывает, а ручка между плато быстрее указателя
	 * не больше чем вдвое: плато не шире четверти промежутка до соседа.
	 * Метки здесь теснее двух радиусов.
	 */
	it('ломаная непрерывна, не убывает, и ручка не быстрее указателя вдвое', () => {
		const strategy = create(TPlateauSnapStrategy, { points: [0.1, 0.12, 0.5], radius: 0.1 })
		const step = 0.0005
		let previous = strategy.follow(0, 0)

		for (let target = step; target <= 1; target += step) {
			const placed = strategy.follow(target, 0)

			expect(placed).toBeGreaterThanOrEqual(previous)
			expect(placed - previous).toBeLessThanOrEqual(2 * step + 1e-9)

			previous = placed
		}
	})

	it('между тесными метками остаётся ход: значения между ними достижимы', () => {
		const strategy = create(TPlateauSnapStrategy, { points: [0.3, 0.32], radius: 0.1 })

		expect(strategy.follow(0.31, 0)).toBeCloseTo(0.31)
		expect(strategy.follow(0.3, 0)).toBe(0.3)
		expect(strategy.follow(0.32, 0)).toBe(0.32)
	})

	/**
	 * Взятая вне плато ручка стоит на месте: её место — узел ломаной, и
	 * первое движение не переносит её на сжатую шкалу.
	 */
	it('ручка вне плато в начале жеста стоит на своём месте, промежуток сжат вокруг неё', () => {
		const strategy = middle(0.3)

		expect(strategy.follow(0.3, 0)).toBe(0.3)
		expect(strategy.follow(0.1, 0)).toBeCloseTo(0.1)
		expect(strategy.follow(0.35, 0)).toBeCloseTo(0.4)
		expect(strategy.follow(0.4, 0)).toBe(0.5)
	})

	it('ручка на плато в начале жеста встаёт на его метку', () => {
		expect(middle(0.45).follow(0.45, 0)).toBe(0.5)
	})

	it('без меток ручка идёт за указателем', () => {
		const strategy = create(TPlateauSnapStrategy, { points: [], anchor: 0.3 })

		expect(strategy.follow(0.3, 0)).toBe(0.3)
		expect(strategy.follow(0.7, 0)).toBeCloseTo(0.7)
		expect(strategy.release(0.7)).toBeUndefined()
	})
})

describe('settle — доводка', () => {
	it('пока тянут, ручка идёт за указателем', () => {
		expect(trace(create(TSettleSnapStrategy), [0.47, 0.5, 0.53])).toEqual([0.47, 0.5, 0.53])
	})

	it('отпущенную в радиусе метки доводит до неё, за радиусом — нет', () => {
		const strategy = create(TSettleSnapStrategy)

		expect(strategy.release(0.47)).toBe(0.5)
		expect(strategy.release(0.18)).toBe(0.2)
		expect(strategy.release(0.55)).toBeUndefined()
	})
})

describe('hold — задержка', () => {
	it('прошла метку — стоит на ней holdDelay мс, потом догоняет указатель', () => {
		const strategy = create(THoldSnapStrategy, { anchor: 0.3 })

		expect(strategy.follow(0.4, 0)).toBe(0.4)
		expect(strategy.wakeAt).toBeUndefined()

		expect(strategy.follow(0.55, 10)).toBe(0.5)
		expect(strategy.wakeAt).toBe(110)

		expect(strategy.follow(0.6, 109)).toBe(0.5)
		expect(strategy.wakeAt).toBe(110)

		// Указатель стоит, а время вышло — плагин зовёт стратегию сам
		expect(strategy.follow(0.6, 110)).toBe(0.6)
		expect(strategy.wakeAt).toBeUndefined()
	})

	it('достигнутая метка тоже держит; та, с которой ушли, — нет', () => {
		expect(create(THoldSnapStrategy, { anchor: 0.4 }).follow(0.5, 0)).toBe(0.5)
		expect(create(THoldSnapStrategy, { anchor: 0.5 }).follow(0.6, 0)).toBe(0.6)
	})

	it('назад — тоже пересечение', () => {
		expect(create(THoldSnapStrategy, { anchor: 0.6 }).follow(0.45, 0)).toBe(0.5)
	})

	it('быстрый жест стоит на первой метке пути, остальные проходит, догоняя', () => {
		const strategy = create(THoldSnapStrategy, { anchor: 0.1 })

		expect(strategy.follow(0.9, 0)).toBe(0.2)
		expect(strategy.follow(0.9, 100)).toBe(0.9)
	})

	it('отпущенную не доводит: пока стоит, она и так на метке', () => {
		const strategy = create(THoldSnapStrategy, { anchor: 0.4 })

		strategy.follow(0.55, 0)

		expect(strategy.release(0.55)).toBeUndefined()
	})
})
