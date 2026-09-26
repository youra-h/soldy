import type { IScale } from './types'

/**
 * Число в отрезке `[low, high]`. `NaN` уходит в `low`: доля и значение из
 * пустого места (нулевая ширина дорожки, незаданный проп) — это начало хода,
 * а не отравленная арифметика дальше по цепочке.
 */
export function clamp(value: number, low: number, high: number): number {
	if (!(value > low)) return low

	return value < high ? value : high
}

/**
 * Доля значения на отрезке `[min, max]` — от 0 до 1: вне отрезка — край,
 * `NaN` — начало. У пустого отрезка (`max` не больше `min`) доли нет, и
 * значение стоит в начале.
 *
 * Формула одна на ядро: доля хода у шкалы ползунка и доля готового у
 * индикатора выполнения, которому шкала с шагом не нужна.
 */
export function fractionOf(value: number, min: number, max: number): number {
	const span = max - min

	return span > 0 ? clamp((value - min) / span, 0, 1) : 0
}

/**
 * Сколько шагов делает сдвиг: целое число. Дробное округляется, `NaN` — ни
 * одного шага, а бесконечность доводит до края.
 */
export function steps(count: number): number {
	return Math.round(count) || 0
}

/**
 * Общее у двух видов шкалы: границы и перевод «доля ↔ значение».
 *
 * Перевод линеен по значению при любом шаге: у списка допустимых значений
 * точка встаёт туда же, куда встала бы на линейке, а ближайшее достижимое
 * значение выбирает `snap` вида. Поэтому здесь нет ни одной ветки по виду.
 */
export abstract class TScale implements IScale {
	readonly min: number
	readonly max: number

	constructor(min: number, max: number) {
		this.min = min
		this.max = Math.max(min, max)
	}

	abstract readonly interval: number | undefined
	abstract get first(): number
	abstract get last(): number
	abstract get points(): readonly number[]
	abstract snap(value: number): number
	abstract shift(value: number, count: number): number

	fraction(value: number): number {
		return fractionOf(value, this.min, this.max)
	}

	valueAt(fraction: number): number {
		return this.snap(this.min + clamp(fraction, 0, 1) * (this.max - this.min))
	}
}
