import { TSlideSnapStrategy } from './base.strategy'
import { nearestPoint } from './points'

/**
 * TSettleSnapStrategy — доводка (`settle`): пока тянут, ручка идёт за
 * указателем; отпустили в радиусе метки — ручка доезжает до неё.
 *
 * Доводит уже не жест: владелец снимает перетаскивание и ставит ручку на
 * метку (`ISlidable.settle`), и тема довозит её своим переходом.
 */
export class TSettleSnapStrategy extends TSlideSnapStrategy {
	override release(target: number): number | undefined {
		return nearestPoint(this._points, target, this._radius)
	}
}
