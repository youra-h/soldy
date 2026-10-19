import { TListScale } from './list.scale'
import { TStepScale } from './step.scale'
import type { IScale, TScaleOptions } from './types'

/**
 * Шкала по опциям. Вид выбирает форма шага — число или список, — и выбирает
 * один раз, здесь: в операциях самой шкалы веток по виду нет.
 *
 * Бесконечность на своей стороне — открытая сторона: `min` — `-Infinity`,
 * `max` — `Infinity`, и ход с неё не кончается (поле числа без границ).
 * Границу, которая не число, — `NaN` и бесконечность с чужой стороны, —
 * заменяет соседняя: `min` — нулём, `max` — `min`. Шкала отвечает долями и
 * значениями на каждом кадре перетаскивания, и один `NaN` в границе отравил бы
 * их все.
 */
export function createScale({ min, max, step }: TScaleOptions): IScale {
	const low = min === -Infinity || Number.isFinite(min) ? min : 0
	const high = max === Infinity || Number.isFinite(max) ? max : low

	return typeof step === 'number'
		? new TStepScale(low, high, step)
		: new TListScale(low, high, step)
}
