import { TStylable } from '../../base/stylable'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import { clamp, fractionOf } from '../../../common/scale/scale.class'
import { percent } from '../../../common/utility/percent'
import type {
	IProgressLinear,
	IProgressLinearProps,
	TProgressLinearEvents,
	TProgressLinearStates,
	TProgressLinearStyle,
} from './types'

/**
 * Индикатор выполнения линией: доля готового, когда она известна, и бег,
 * когда неизвестна.
 *
 * **Значение хранится как задано.** Полоса значение не правит и в форму не
 * отдаёт, поэтому резольвера, как у Slider, у неё нет: границы шкалы действуют
 * только в выходах. Доля (`percentStyle`) прижата к 0–100 %, `aria-valuenow` —
 * к `[min, max]`, и полоса со скринридером показывают одно и то же. Порядок
 * записи не важен: значение, пришедшее раньше `max`, к прежнему `max` не
 * прижимается и не теряется.
 *
 * Паттерн — роль `progressbar`. Пока доля неизвестна, `aria-valuenow` нет:
 * так объявляется неопределённый индикатор, и скринридер не прочтёт «0 %».
 * Имя даёт `TAriaPlugin` (`aria_label`, `aria_labelledBy`), как у Spinner:
 * строк языка интерфейса у библиотеки нет. Содержимого у полосы нет — дети
 * роли `progressbar` презентационные, скринридер их не читает. Подпись и
 * число потребитель ставит рядом своей разметкой.
 *
 * Теме на корне — `data-indeterminate` и доля CSS-переменной. Бег по
 * `data-indeterminate` рисует сама тема: движение — её дело, а не ядра.
 */
export default class TProgressLinear
	extends TStylable<IProgressLinearProps, TProgressLinearEvents, TProgressLinearStates>
	implements IProgressLinear
{
	static override baseClass = 's-progress-linear'

	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<IProgressLinearProps, 'value' | 'min' | 'max'> = {
		...TStylable.defaultValues,
		// Полосу кладут в `Button` и `Label`, а внутри них HTML разрешает
		// только строчную разметку
		tag: 'span',
		value: null,
		min: 0,
		max: 100,
	}

	protected _value: number | null
	protected _min: number
	protected _max: number

	constructor(
		props: Partial<IProgressLinearProps> = {},
		options: IComponentOptions<TProgressLinearStates> = {},
	) {
		super(props, options)

		const ctor = new.target as typeof TProgressLinear

		this._value = props.value ?? ctor.defaultValues.value
		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max

		this._aria.add('role', 'progressbar')

		this.events.on('change:value', () => this._syncValue())
		this.events.on('change:min', () => this._syncValue())
		this.events.on('change:max', () => this._syncValue())

		this._syncValue()
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	get value(): number | null {
		return this._value
	}

	set value(value: number | null) {
		if (this._value === value) return

		this._value = value
		this.events.emit('change:value', value)
	}

	get min(): number {
		return this._min
	}

	set min(value: number) {
		if (this._min === value) return

		this._min = value
		this.events.emit('change:min', value)
	}

	get max(): number {
		return this._max
	}

	set max(value: number) {
		if (this._max === value) return

		this._max = value
		this.events.emit('change:max', value)
	}

	/* ------------------------------------------------------------------ */
	/* Выходы для разметки                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * `--s-progress-linear-percent` — доля готового процентом: вне шкалы —
	 * край, у пустой шкалы (`max` не больше `min`) — `0%`. Пока доля
	 * неизвестна, переменной нет: заливка уходит к нулю, и пришедшую долю тема
	 * ведёт от начала дорожки, а не с того места, где её оставили.
	 */
	get percentStyle(): TProgressLinearStyle {
		if (this._value === null) return {}

		return {
			'--s-progress-linear-percent': percent(fractionOf(this._value, this._min, this._max)),
		}
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Наборы, которые следуют из значения и шкалы: `aria-value*` —
	 * скринридеру, `data-indeterminate` — теме. `data-indeterminate` стоит с
	 * первой отрисовки, и у известной доли — значением `"false"`: тема
	 * отличает «доля известна» от «неприменимо».
	 */
	protected _syncValue(): void {
		const value = this._value

		this._aria.add('aria-valuemin', String(this._min))
		this._aria.add('aria-valuemax', String(this._max))
		this._aria.add('aria-valuenow', value === null ? null : String(this._now(value)))
		this._dataset.add('indeterminate', value === null)
	}

	/**
	 * Значение для скринридера — на шкале, как и доля полосы. У пустой шкалы
	 * — `min`: полоса там пуста.
	 */
	protected _now(value: number): number {
		return clamp(value, this._min, Math.max(this._min, this._max))
	}

	override getProps(): IProgressLinearProps {
		return {
			...super.getProps(),
			value: this._value,
			min: this._min,
			max: this._max,
		}
	}
}
