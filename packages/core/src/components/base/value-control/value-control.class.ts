import { TControl } from '../control'
import type { IComponentOptions } from '../component'
import type { IValueControlProps, TValueControlEvents, TValueControlStates } from './types'
import { TStateUnit } from '../../../common'
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
	TStates extends TValueControlStates<TValue> = TValueControlStates<TValue>,
> extends TControl<TProps, TEvents, TStates> {
	static defaultValues: Partial<IValueControlProps<any>> = {
		...TControl.defaultValues,
		name: '',
		value: undefined,
	}

	protected _name: string

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TValueControl

		this._name = props.name ?? (ctor.defaultValues.name as string)

		const value = props.value ?? (ctor.defaultValues.value as TValue)

		this._states.value = options.states?.value ?? new TStateUnit<TValue>({ initial: value })

		this._states.value.events.on('change', (payload: TValuePayload<TValue>) => {
			this._own.emit('change:value', payload)
			this._own.emit('input:value', payload)
			this._own.emit('input', payload)
		})
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _own(): TEventSink<TValueControlEvents<TValue>> {
		return this.events
	}

	get name(): string {
		return this._name
	}
	set name(value: string) {
		if (this._name === value) return

		this._name = value
		this._own.emit('change:name', value)
	}

	get value(): TValue {
		return this._states.value.value
	}
	set value(value: TValue) {
		this._states.value.value = value
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			name: this._name,
			value: this._states.value.value,
		} as TProps
	}
}
