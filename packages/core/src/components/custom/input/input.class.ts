import { TInputControl } from '../../base/input-control'
import type { IComponentOptions } from '../../base/component'
import type { IInput, IInputProps, TInputEvents } from './types'
import { TEvented } from '../../../common'

export class TInput extends TInputControl<string, IInputProps, TInputEvents> implements IInput {
	static override baseClass = 's-input'

	static defaultValues: Partial<IInputProps> = {
		...TInputControl.defaultValues,
		placeholder: '',
	}

	protected _placeholder!: string

	constructor(props: Partial<IInputProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TInput

		this._applyPlaceholder(props.placeholder ?? ctor.defaultValues.placeholder!)
	}

	get placeholder(): string {
		return this._placeholder
	}

	protected _applyPlaceholder(value: string) {
		this._placeholder = value
	}

	set placeholder(value: string) {
		if (this._placeholder === value) return

		this._applyPlaceholder(value)
		;(this.events as TEvented<TInputEvents>).emit('change:placeholder', value)
	}
}
