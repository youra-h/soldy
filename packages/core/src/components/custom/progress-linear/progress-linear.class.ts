import { TProgress } from '../../base/progress'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import { percent } from '../../../common/utility/percent'
import type {
	IProgressLinear,
	IProgressLinearProps,
	TProgressLinearEvents,
	TProgressLinearOrientation,
	TProgressLinearStyle,
} from './types'

/**
 * Индикатор выполнения линией: доля готового, когда она известна, и бег,
 * когда неизвестна.
 *
 * Модель — у базы `TProgress`, общей с кольцом `TProgressSpinner`: значение,
 * шкала, флаг бега, роль `progressbar` с `aria-value*`, `data-indeterminate` и
 * доля. Своё у полосы — ось и то, как доля уходит теме: процентом, потому что
 * заливку тема тянет по длине дорожки.
 *
 * Ось (`orientation`) — модификатор `--horizontal` или `--vertical`, как у
 * Slider и Tabs: значение библиотеки, а не темы. `aria-orientation` ядро не
 * пишет — у роли `progressbar` такого атрибута нет (ARIA 1.2).
 *
 * Теме на корне — модификатор оси, `data-indeterminate` и доля
 * CSS-переменной. Бег по `data-indeterminate` рисует сама тема: движение —
 * её дело, а не ядра.
 */
export default class TProgressLinear
	extends TProgress<IProgressLinearProps, TProgressLinearEvents>
	implements IProgressLinear
{
	static override baseClass = 's-progress-linear'

	static defaultValues: typeof TProgress.defaultValues &
		TDefaultValues<IProgressLinearProps, 'orientation'> = {
		...TProgress.defaultValues,
		orientation: 'horizontal',
	}

	protected _orientation!: TProgressLinearOrientation

	constructor(props: Partial<IProgressLinearProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TProgressLinear

		this._applyOrientation(props.orientation ?? ctor.defaultValues.orientation)
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	get orientation(): TProgressLinearOrientation {
		return this._orientation
	}

	set orientation(value: TProgressLinearOrientation) {
		if (this._orientation === value) return

		this._applyOrientation(value, this._orientation)
		this.events.emit('change:orientation', value)
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * `--s-progress-linear-percent` — доля готового процентом: вне шкалы —
	 * край, у пустой шкалы (`max` не больше `min`) — `0%`. Пока полоса бежит,
	 * переменной нет: заливка уходит к нулю, и долю, вернувшуюся после бега,
	 * тема ведёт от начала дорожки, а не с того места, где её оставили.
	 */
	get percentStyle(): TProgressLinearStyle {
		const fraction = this._fraction

		if (fraction === null) return {}

		return { '--s-progress-linear-percent': percent(fraction) }
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Модификатор оси — без префикса, как у Slider и Tabs: значение
	 * библиотеки, и с именами темы оно не столкнётся. `aria-orientation` нет:
	 * роль `progressbar` его не поддерживает.
	 */
	protected _applyOrientation(
		newValue: TProgressLinearOrientation,
		oldValue?: TProgressLinearOrientation,
	): void {
		this._classes.swapClass({
			oldClass: `--${oldValue}`,
			newClass: `--${newValue}`,
		})
		this._orientation = newValue
	}

	override getProps(): IProgressLinearProps {
		return {
			...super.getProps(),
			orientation: this._orientation,
		}
	}
}
