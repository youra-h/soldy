import { TScale, clamp, steps } from './scale.class'

/**
 * Шаг, которым заменяется неверный — не положительный или не число. Тот же,
 * что у нативного `input[type=range]`: шаг «0» или «−5» браузер тоже считает
 * шагом по умолчанию.
 */
const DEFAULT_STEP = 1

/**
 * Сколько знаков после запятой у числа — с учётом экспоненты: `1e-7` —
 * семь, `2.5e-3` — четыре.
 */
function decimals(value: number): number {
	if (!Number.isFinite(value)) return 0

	const [mantissa, exponent = '0'] = String(value).split('e')
	const fraction = mantissa.split('.')[1]?.length ?? 0

	return Math.max(0, fraction - Number(exponent))
}

/**
 * Шкала с ровным шагом: `min`, `min + step`, `min + 2·step`… не дальше `max`.
 *
 * Сетка считается в целых: границы и шаг умножены на 10 в степени самой
 * длинной дробной части среди них. Так третий узел сетки с шагом 0.1 — ровно
 * 0.3, а не 0.30000000000000004, и значение ручки сравнивается с меткой
 * обычным равенством. Последний узел — целочисленным делением: `max` вне
 * сетки недостижим, как у нативного поля.
 */
export class TStepScale extends TScale {
	readonly interval: number
	/** Множитель к целым */
	private readonly _unit: number
	/** Начало сетки в целых */
	private readonly _origin: number
	/** Шаг в целых */
	private readonly _span: number
	/** Номер последнего узла сетки */
	private readonly _count: number

	constructor(min: number, max: number, step: number) {
		super(min, max)

		this.interval = step > 0 && Number.isFinite(step) ? step : DEFAULT_STEP
		this._unit = 10 ** Math.max(decimals(this.min), decimals(this.max), decimals(this.interval))
		this._origin = Math.round(this.min * this._unit)
		this._span = Math.round(this.interval * this._unit)
		this._count = Math.floor((Math.round(this.max * this._unit) - this._origin) / this._span)
	}

	get first(): number {
		return this._at(0)
	}

	get last(): number {
		return this._at(this._count)
	}

	/** Узлы сетки. Считаются на каждое чтение: у мелкого шага их тысячи, а нужны они только меткам. */
	get points(): readonly number[] {
		return Array.from({ length: this._count + 1 }, (_, index) => this._at(index))
	}

	snap(value: number): number {
		return this._at(this._index(value))
	}

	shift(value: number, count: number): number {
		return this._at(clamp(this._index(value) + steps(count), 0, this._count))
	}

	/** Номер ближайшего узла; поровну от двух — большего, как у нативного поля. */
	private _index(value: number): number {
		return clamp(Math.round((value * this._unit - this._origin) / this._span), 0, this._count)
	}

	private _at(index: number): number {
		return (this._origin + index * this._span) / this._unit
	}
}
