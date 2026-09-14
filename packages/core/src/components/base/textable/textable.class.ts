import { TStateUnit } from '../../../common'
import type { TValuePayload, TEventSink } from '../../../common'
import { TControl } from '../control'
import type { IComponentOptions } from '../component'
import type { ITextableProps, TTextableEvents, TTextableStates } from './types'

/**
 * Слой "textable": добавляет отображаемое текстовое значение `text`.
 *
 * Правило проекта:
 * - `value` — скрытое/внутреннее значение контрола
 * - `text` — то, что выводится на экран
 */
export default class TTextable<
	TProps extends ITextableProps = ITextableProps,
	TEvents extends TTextableEvents = TTextableEvents,
	TStates extends TTextableStates = TTextableStates,
> extends TControl<TProps, TEvents, TStates> {
	static defaultValues: Partial<ITextableProps> = {
		...TControl.defaultValues,
		text: '',
	}

	constructor(props: Partial<TProps> = {}, options: IComponentOptions<TStates> = {}) {
		super(props, options)

		const ctor = new.target as typeof TTextable

		const text = props.text ?? (ctor.defaultValues.text as string)

		this._states.text = options.states?.text ?? new TStateUnit<string>({ initial: text })

		this._states.text.events.on('change', (payload: TValuePayload<string>) => {
			this._sink.emit('change:text', payload)
		})
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTextableEvents> {
		return this.events
	}

	get text(): string {
		return this._states.text.value
	}

	set text(value: string) {
		this._states.text.value = value
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
		} as TProps
	}
}
