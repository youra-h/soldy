import { TSlideSnapStrategy } from './base.strategy'
import { nearestPoint } from './points'

/**
 * TMagnetSnapStrategy — притяжение (`magnet`): в радиусе метки ручка стоит на
 * ней, за радиусом идёт за указателем.
 *
 * Так же притягивает и нажатие мимо ручек: нажали рядом с меткой — ручка
 * встала на метку.
 */
export class TMagnetSnapStrategy extends TSlideSnapStrategy {
	override follow(target: number): number {
		return nearestPoint(this._points, target, this._radius) ?? target
	}
}
