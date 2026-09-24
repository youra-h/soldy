import { TScale, clamp, steps } from './scale.class'

/**
 * Шкала-список: достижимы только перечисленные значения — неравный шаг вроде
 * `1, 2, 5, 10, 20, 50`. Шаг клавишей — к соседнему элементу списка.
 *
 * Значения вне `[min, max]` отбрасываются: у них нет места на ходе. Повторы
 * схлопываются, порядок — по возрастанию, в каком бы ни пришёл список. Пустой
 * список оставляет достижимым одно `min`: ручке нужно где-то стоять.
 */
export class TListScale extends TScale {
	readonly interval = undefined
	readonly points: readonly number[]

	constructor(min: number, max: number, values: readonly number[]) {
		super(min, max)

		// Сравнение с границами отсеивает и `NaN`
		const inside = values.filter((value) => value >= this.min && value <= this.max)
		const points = [...new Set(inside)].sort((a, b) => a - b)

		this.points = points.length > 0 ? points : [this.min]
	}

	get first(): number {
		return this.points[0]
	}

	get last(): number {
		return this.points[this.points.length - 1]
	}

	snap(value: number): number {
		return this.points[this._index(value)]
	}

	shift(value: number, count: number): number {
		return this.points[clamp(this._index(value) + steps(count), 0, this.points.length - 1)]
	}

	/**
	 * Номер ближайшего значения; поровну от двух — большего, как у сетки.
	 * `NaN` ни к чему не ближе — остаётся первое.
	 */
	private _index(value: number): number {
		let nearest = 0

		for (let index = 1; index < this.points.length; index++) {
			if (Math.abs(this.points[index] - value) <= Math.abs(this.points[nearest] - value)) {
				nearest = index
			}
		}

		return nearest
	}
}
