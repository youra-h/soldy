import { TSlideSnapStrategy } from './base.strategy'
import { crossedPoint } from './points'
import type { THoldStop, TSlideSnapContext } from './types'

/**
 * THoldSnapStrategy — задержка (`hold`): ручка, которая прошла или достигла
 * метки, стоит на ней `holdDelay` мс и потом догоняет указатель. Отпустили,
 * пока стоит, — ручка осталась на метке.
 *
 * Время стратегия получает с каждым шагом (`now`), а не заводит таймер сама:
 * когда стоянка кончится, она сообщает (`wakeAt`), и плагин зовёт её снова,
 * хотя указатель стоит. Пока ручка стоит, другие метки на пути не держат:
 * догнав указатель, она проходит их без остановки.
 */
export class THoldSnapStrategy extends TSlideSnapStrategy {
	private readonly _delay: number
	/** Где ручка была бы без щелчка шагом раньше — от неё виден путь через метку */
	private _last: number
	private _stop: THoldStop | undefined = undefined

	constructor(context: TSlideSnapContext) {
		super(context)

		this._delay = context.holdDelay
		this._last = context.anchor
	}

	override get wakeAt(): number | undefined {
		return this._stop?.until
	}

	override follow(target: number, now: number): number {
		const from = this._last

		this._last = target

		if (this._stop && now < this._stop.until) return this._stop.point

		const point = crossedPoint(this._points, from, target)

		this._stop = point === undefined ? undefined : { point, until: now + this._delay }

		return point ?? target
	}
}
