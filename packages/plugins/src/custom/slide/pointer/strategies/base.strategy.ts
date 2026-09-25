import type { ISlideSnapStrategy, TSlideSnapContext } from './types'

/**
 * TSlideSnapStrategy — общая часть стратегий щелчка: ручка идёт за
 * указателем, отпущенная остаётся, где её отпустили, и ждать нечего.
 *
 * Режим — наследник, который меняет одно из трёх: веток по режиму здесь нет.
 * Наследник без изменений — режим `none` (`TNoneSnapStrategy`).
 */
export abstract class TSlideSnapStrategy implements ISlideSnapStrategy {
	protected readonly _points: readonly number[]
	protected readonly _radius: number

	constructor({ points, radius }: TSlideSnapContext) {
		this._points = points
		// Радиус меньше нуля или не число — ноль: щелчок только точно в метку
		this._radius = radius > 0 ? radius : 0
	}

	get wakeAt(): number | undefined {
		return undefined
	}

	follow(target: number, _now: number): number {
		return target
	}

	release(_target: number): number | undefined {
		return undefined
	}
}
