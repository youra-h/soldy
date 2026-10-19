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
 *
 * **Открытая сторона** (`min` — `-Infinity`, `max` — `Infinity`) — сетка без
 * края: узлы идут с неё без конца, первый или последний узел — бесконечность.
 * Начало сетки — `min`, а без него — ноль, как у нативного поля без `min`.
 * Узлов открытой шкалы не перечислить, и меток (`points`) у неё нет.
 */
export class TStepScale extends TScale {
	readonly interval: number
	/** Множитель к целым */
	private readonly _unit: number
	/** Начало сетки в целых: `min`, у открытого начала — ноль */
	private readonly _origin: number
	/** Шаг в целых */
	private readonly _span: number
	/** Номер первого узла сетки; у открытого начала — `-Infinity` */
	private readonly _low: number
	/** Номер последнего узла сетки; у открытого конца — `Infinity` */
	private readonly _high: number

	constructor(min: number, max: number, step: number) {
		super(min, max)

		this.interval = step > 0 && Number.isFinite(step) ? step : DEFAULT_STEP
		this._unit = 10 ** Math.max(decimals(this.min), decimals(this.max), decimals(this.interval))
		this._origin = Number.isFinite(this.min) ? Math.round(this.min * this._unit) : 0
		this._span = Math.round(this.interval * this._unit)
		this._low = Number.isFinite(this.min) ? 0 : -Infinity
		this._high = Number.isFinite(this.max)
			? Math.floor((Math.round(this.max * this._unit) - this._origin) / this._span)
			: Infinity
	}

	get first(): number {
		return this._at(this._low)
	}

	get last(): number {
		return this._at(this._high)
	}

	/**
	 * Узлы сетки. Считаются на каждое чтение: у мелкого шага их тысячи, а нужны
	 * они только меткам. У открытой шкалы узлов без конца — меток нет.
	 */
	get points(): readonly number[] {
		if (!Number.isFinite(this._low) || !Number.isFinite(this._high)) return []

		return Array.from({ length: this._high - this._low + 1 }, (_, index) =>
			this._at(this._low + index),
		)
	}

	snap(value: number): number {
		return this._at(this._index(value))
	}

	/**
	 * Первый шаг — к соседнему узлу со стороны сдвига: значение вне сетки стоит
	 * между двумя узлами, и ближайший с той стороны уже шаг — с 2,5 при шаге 1
	 * вверх на 3, вниз на 2. С узла сетки — на `count` узлов.
	 */
	shift(value: number, count: number): number {
		const step = steps(count)
		const index = this._index(value)
		const node = this._at(index)
		const from =
			node < value && step < 0 ? index + 1 : node > value && step > 0 ? index - 1 : index

		return this._at(clamp(from + step, this._low, this._high))
	}

	/** Номер ближайшего узла; поровну от двух — большего, как у нативного поля. */
	private _index(value: number): number {
		return clamp(
			Math.round((value * this._unit - this._origin) / this._span),
			this._low,
			this._high,
		)
	}

	private _at(index: number): number {
		return (this._origin + index * this._span) / this._unit
	}
}
