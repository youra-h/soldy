import { TChangeEvent } from '../../../common'
import type { TEventSink } from '../../../common'
import { TControl } from '../control'
import type { TDefaultValues } from '../component'
import type { ITextableProps, TTextableEvents } from './types'

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
> extends TControl<TProps, TEvents> {
	static defaultValues: typeof TControl.defaultValues & TDefaultValues<ITextableProps, 'text'> = {
		...TControl.defaultValues,
		text: '',
	}

	protected _text: string

	constructor(props: Partial<TProps> = {}) {
		super(props)

		const ctor = new.target as typeof TTextable

		this._text = props.text ?? ctor.defaultValues.text
	}

	/**
	 * Эмит собственных событий класса — без приведения `this.events` к
	 * конкретной карте (см. `TEventSink` в `common/event/types.ts`).
	 */
	protected get _sink(): TEventSink<TTextableEvents> {
		return this.events
	}

	get text(): string {
		return this._text
	}

	set text(value: string) {
		if (value === this._text) return

		const e = new TChangeEvent(value, this._text)

		this._sink.emit('change:text:before', e)

		if (e.defaultPrevented || e.value === this._text) return

		this._text = e.value
		this._sink.emit('change:text', { newValue: e.value, oldValue: e.oldValue })
	}

	getProps(): TProps {
		return {
			...super.getProps(),
			text: this.text,
		} as TProps
	}
}
