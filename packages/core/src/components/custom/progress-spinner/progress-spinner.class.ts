import { TProgress } from '../../base/progress'
import { decimal } from '../../../common/utility/percent'
import type { IProgressSpinner, TProgressSpinnerStyle } from './types'

/**
 * Индикатор выполнения кольцом: доля готового, когда она известна, и бег,
 * когда неизвестна.
 *
 * Модель — у базы `TProgress`, общей с линией `TProgressLinear`: значение,
 * шкала, флаг бега, роль `progressbar` с `aria-value*`, `data-indeterminate` и
 * доля. Своих свойств у кольца нет. Своё у него — рисунок, а из него то, как
 * доля уходит теме: числом без единиц, потому что длину дуги SVG меряет в
 * долях окружности. Оси у кольца нет: дуга идёт по кругу, а не вдоль строки.
 *
 * Со Spinner кольцо не сливается и режимом его не становится: у Spinner роль
 * `status` — «занят», а у кольца `progressbar` — «сделано столько-то».
 *
 * Теме на корне — `data-indeterminate` и доля CSS-переменной. Бег по
 * `data-indeterminate` рисует сама тема: движение — её дело, а не ядра.
 */
export default class TProgressSpinner extends TProgress implements IProgressSpinner {
	static override baseClass = 's-progress-spinner'

	/**
	 * `--s-progress-spinner-fraction` — доля готового числом от 0 до 1: вне
	 * шкалы — край, у пустой шкалы (`max` не больше `min`) — `0`. Пока кольцо
	 * бежит, переменной нет: дуга уходит к нулю, и долю, вернувшуюся после
	 * бега, тема ведёт от начала кольца, а не с того места, где её оставили.
	 */
	get fractionStyle(): TProgressSpinnerStyle {
		const fraction = this._fraction

		if (fraction === null) return {}

		return { '--s-progress-spinner-fraction': decimal(fraction) }
	}
}
