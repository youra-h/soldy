import { TStateUnit, TEvented } from '../../../common'
import type { TValuePayload } from '../../../common'
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
			;(this.events as TEvented<TTextableEvents>).emit('change:text', payload)
		})
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
