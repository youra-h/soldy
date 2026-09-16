import { TStateUnit } from '../../../common'
import { TComponentView } from '../component-view'
import type { IComponentOptions, TDefaultValues } from '../component'
import type { IInteractiveProps, TInteractiveEvents, TInteractiveStates } from './types'
import type { TValuePayload, TEventSink } from '../../../common'

/**
 * База для интерактивных компонентов: disabled + focused.
 *
 * Внутри использует value-based state-unit (`TStateUnit<boolean>`) и пробрасывает
 * события наружу в формате `change:*`.
 */
export default class TInteractive<
	TProps extends IInteractiveProps = IInteractiveProps,
	TEvents extends TInteractiveEvents = TInteractiveEvents,
	TStates extends TInteractiveStates = TInteractiveStates,
> extends TComponentView<TProps, TEvents, TStates> {
	static defaultValues: typeof TComponentView.defaultValues &
		TDefaultValues<IInteractiveProps, 'disabled' | 'focused'> = {
		...TComponentView.defaultValues,
		disabled: false,
		focused: false,
	}

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TInteractive

		const disabled = props.disabled ?? ctor.defaultValues.disabled
		const focused = props.focused ?? ctor.defaultValues.focused

		this._states.disabled =
			options.states?.disabled ?? new TStateUnit<boolean>({ initial: disabled })

		this._states.disabled.events.on('change', (payload: TValuePayload<boolean>) => {
			this._sink.emit('change:disabled', payload.newValue)
		})

		this._states.focused =
			options.states?.focused ?? new TStateUnit<boolean>({ initial: focused })

		this._states.focused.events.on('change', (payload: TValuePayload<boolean>) => {
			this._sink.emit('change:focused', payload.newValue)
		})
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TInteractiveEvents> {
		return this.events
	}

	get disabled(): boolean {
		return this._states.disabled.value
	}
	set disabled(value: boolean) {
		this._states.disabled.value = value
	}

	get focused(): boolean {
		return this._states.focused.value
	}
	set focused(value: boolean) {
		this._states.focused.value = value
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			disabled: this.disabled,
			focused: this.focused,
		} as TProps
	}
}
