import { TStylable } from '../stylable'
import type { TDefaultValues } from '../component'
import type { TEventSink } from '../../../common'
import { clamp, fractionOf } from '../../../common/scale/scale.class'
import type { IProgress, IProgressProps, TProgressEvents } from './types'

/**
 * Индикатор выполнения — общая база линии (`TProgressLinear`) и кольца
 * (`TProgressSpinner`): доля готового, когда она известна, и бег, когда
 * неизвестна.
 *
 * Модель у форм одна, различаются разметка и то, как тема рисует долю.
 * Поэтому всё, что следует из значения, шкалы и флага бега, живёт здесь один
 * раз: роль, `aria-value*`, `data-indeterminate` и сама доля (`_fraction`).
 * Форма только отдаёт долю разметке в своём виде — процентом у линии, числом у
 * кольца. Блок CSS называет форма, поэтому своего `baseClass` у базы нет.
 *
 * **Бег — флаг `indeterminate`, и он главнее значения**, как у CheckBox:
 * пока он стоит, доли и `aria-valuenow` нет, а `value` хранится как было и
 * вернётся, когда бег снимут. Второго пути к бегу нет: `value` — всегда
 * число, по умолчанию `0`.
 *
 * **Значение хранится как задано.** Индикатор значение не правит и в форму не
 * отдаёт, поэтому итога по шкале, как у Slider, у него нет: границы шкалы
 * действуют только в выходах. Доля прижата к 0–1, `aria-valuenow` — к
 * `[min, max]`, и индикатор со скринридером показывают одно и то же. Порядок
 * записи не важен: значение, пришедшее раньше `max`, к прежнему `max` не
 * прижимается и не теряется.
 *
 * Паттерн — роль `progressbar`. Пока индикатор бежит, `aria-valuenow` нет:
 * так объявляется неопределённый индикатор, и скринридер не прочтёт «0 %».
 * Имя даёт `TAriaPlugin` (`aria_label`, `aria_labelledBy`): строк языка
 * интерфейса у библиотеки нет. Содержимого у индикатора нет — дети роли
 * `progressbar` презентационные, скринридер их не читает. Подпись и число
 * потребитель ставит рядом своей разметкой.
 *
 * Теме на корне — `data-indeterminate` и доля CSS-переменной формы. Бег по
 * `data-indeterminate` рисует сама тема: движение — её дело, а не ядра.
 */
export default class TProgress<
	TProps extends IProgressProps = IProgressProps,
	TEvents extends TProgressEvents = TProgressEvents,
>
	extends TStylable<TProps, TEvents>
	implements IProgress<TProps, TEvents>
{
	static defaultValues: typeof TStylable.defaultValues &
		TDefaultValues<IProgressProps, 'value' | 'min' | 'max' | 'indeterminate'> = {
		...TStylable.defaultValues,
		// Индикатор кладут в `Button` и `Label`, а внутри них HTML разрешает
		// только строчную разметку
		tag: 'span',
		value: 0,
		min: 0,
		max: 100,
		indeterminate: false,
	}

	protected _value: number
	protected _min: number
	protected _max: number
	protected _indeterminate: boolean

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TProgress

		this._value = props.value ?? ctor.defaultValues.value
		this._min = props.min ?? ctor.defaultValues.min
		this._max = props.max ?? ctor.defaultValues.max
		this._indeterminate = props.indeterminate ?? ctor.defaultValues.indeterminate

		this._aria.add('role', 'progressbar')

		this.events.on('change:value', () => this._syncValue())
		this.events.on('change:min', () => this._syncValue())
		this.events.on('change:max', () => this._syncValue())
		this.events.on('change:indeterminate', () => this._syncValue())

		this._syncValue()
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected override get _sink(): TEventSink<TProgressEvents> {
		return this.events
	}

	/* ------------------------------------------------------------------ */
	/* Свойства                                                           */
	/* ------------------------------------------------------------------ */

	get value(): number {
		return this._value
	}

	set value(value: number) {
		if (this._value === value) return

		this._value = value
		this._sink.emit('change:value', value)
	}

	get min(): number {
		return this._min
	}

	set min(value: number) {
		if (this._min === value) return

		this._min = value
		this._sink.emit('change:min', value)
	}

	get max(): number {
		return this._max
	}

	set max(value: number) {
		if (this._max === value) return

		this._max = value
		this._sink.emit('change:max', value)
	}

	get indeterminate(): boolean {
		return this._indeterminate
	}

	set indeterminate(value: boolean) {
		if (this._indeterminate === value) return

		this._indeterminate = value
		this._sink.emit('change:indeterminate', value)
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/**
	 * Доля готового от 0 до 1 — вне шкалы край, у пустой шкалы (`max` не
	 * больше `min`) — 0. Пока индикатор бежит, доли нет (`null`): переменной
	 * формы на корне тогда нет, и тема ведёт долю, вернувшуюся после бега, от
	 * нуля, а не с того места, где её оставили.
	 *
	 * Одна точка на все формы: выход формы только записывает долю в своём виде
	 * и сам ни шкалы, ни флага не читает.
	 */
	protected get _fraction(): number | null {
		if (this._indeterminate) return null

		return fractionOf(this._value, this._min, this._max)
	}

	/**
	 * Наборы, которые следуют из значения, шкалы и флага бега: `aria-value*` —
	 * скринридеру, `data-indeterminate` — теме. `data-indeterminate` стоит с
	 * первой отрисовки, и у известной доли — значением `"false"`: тема
	 * отличает «доля известна» от «неприменимо».
	 */
	protected _syncValue(): void {
		const running = this._indeterminate

		this._aria.add('aria-valuemin', String(this._min))
		this._aria.add('aria-valuemax', String(this._max))
		this._aria.add('aria-valuenow', running ? null : String(this._now(this._value)))
		this._dataset.add('indeterminate', running)
	}

	/**
	 * Значение для скринридера — на шкале, как и доля индикатора. У пустой
	 * шкалы — `min`: индикатор там пуст.
	 */
	protected _now(value: number): number {
		return clamp(value, this._min, Math.max(this._min, this._max))
	}

	override getProps(): TProps {
		return {
			...super.getProps(),
			value: this._value,
			min: this._min,
			max: this._max,
			indeterminate: this._indeterminate,
		}
	}
}
