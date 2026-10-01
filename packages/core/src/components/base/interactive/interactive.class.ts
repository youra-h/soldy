import { TComponentView } from '../component-view'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { IInteractiveProps, TInteractiveEvents } from './types'
import { TChangeEvent } from '../../../common'
import type { TEventSink } from '../../../common'

/**
 * База для интерактивных компонентов: disabled + focused.
 *
 * Свойства — поля класса, события — в формате `change:*`; запись расширяют
 * `change:disabled:before` и `change:focused:before`.
 */
export default class TInteractive<
	TProps extends IInteractiveProps = IInteractiveProps,
	TEvents extends TInteractiveEvents = TInteractiveEvents,
> extends TComponentView<TProps, TEvents> {
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IInteractiveProps, 'disabled' | 'focused'> = {
		...TComponentView.defaultValues,
		disabled: false,
		focused: false,
	}

	protected _disabled: boolean
	protected _focused: boolean

	constructor(props: Partial<TProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TInteractive

		this._disabled = props.disabled ?? ctor.defaultValues.disabled
		this._focused = props.focused ?? ctor.defaultValues.focused
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TInteractiveEvents> {
		return this.events
	}

	get disabled(): boolean {
		return this._disabled
	}
	set disabled(value: boolean) {
		if (value === this._disabled) return

		const e = new TChangeEvent(value, this._disabled)

		this._sink.emit('change:disabled:before', e)

		if (e.defaultPrevented || e.value === this._disabled) return

		this._disabled = e.value
		this._sink.emit('change:disabled', e.value)
	}

	get focused(): boolean {
		return this._focused
	}
	set focused(value: boolean) {
		if (value === this._focused) return

		const e = new TChangeEvent(value, this._focused)

		this._sink.emit('change:focused:before', e)

		if (e.defaultPrevented || e.value === this._focused) return

		this._focused = e.value
		this._sink.emit('change:focused', e.value)
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			disabled: this.disabled,
			focused: this.focused,
		} as TProps
	}
}
