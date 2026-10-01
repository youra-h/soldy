import { TControl } from '../control'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { IValueControlProps, TValueControlEvents } from './types'
import { TChangeEvent } from '../../../common'
import { sameValue } from '../../../common/utility/same-value'
import type { TValuePayload, TEventSink } from '../../../common'

/**
 * База для контролов со значением.
 *
 * Содержит:
 * - `value` (commit) + `input(value)` (optional)
 * - `name` (form semantics)
 *
 * Интерактивность (disabled/focused) и stylable (size/variant) наследуются из `TControl`.
 */
export default class TValueControl<
	TValue,
	TProps extends IValueControlProps<TValue> = IValueControlProps<TValue>,
	TEvents extends TValueControlEvents<TValue> = TValueControlEvents<TValue>,
> extends TControl<TProps, TEvents> {
	static defaultValues: typeof TControl.defaultValues &
		TDefaultValues<IValueControlProps<any>, 'name', 'value'> = {
		...TControl.defaultValues,
		name: '',
		value: undefined,
	}

	protected _name: string
	protected _value: TValue

	constructor(props: Partial<TProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TValueControl

		this._name = props.name ?? ctor.defaultValues.name

		this._value = props.value ?? (ctor.defaultValues.value as TValue)
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TValueControlEvents<TValue>> {
		return this.events
	}

	get name(): string {
		return this._name
	}
	set name(value: string) {
		if (this._name === value) return

		this._name = value
		this._sink.emit('change:name', value)
	}

	get value(): TValue {
		return this._value
	}
	/**
	 * Пишет своё значение. Список сверяется поэлементно (`sameValue`): эхо
	 * модели тем же списком — не смена.
	 */
	set value(value: TValue) {
		if (sameValue(value, this._value)) return

		const e = new TChangeEvent(value, this._value)

		this._sink.emit('change:value:before', e)

		if (e.defaultPrevented || sameValue(e.value, this._value)) return

		const before = this.value

		this._value = e.value
		this._valueChanged(before)
	}

	/**
	 * Итог `value` мог смениться — `change:value`, `input:value` и `input`, если
	 * сменился. Наследник, чей итог зависит не только от своего значения
	 * (Slider прижимает его к шкале), зовёт это и при смене той зависимости.
	 */
	protected _valueChanged(oldValue: TValue): void {
		const newValue = this.value
		if (sameValue(newValue, oldValue)) return

		const payload: TValuePayload<TValue> = { newValue, oldValue }

		this._sink.emit('change:value', payload)
		this._sink.emit('input:value', payload)
		this._sink.emit('input', payload)
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			name: this._name,
			value: this.value,
		} as TProps
	}
}
