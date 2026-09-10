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

	/**
	 * На теге `input` `required` нативный — но только пока поле не `readonly`:
	 * браузер не валидирует `readonly`-поле, и нативный `required` на нём
	 * бессмыслен, `aria-required` тогда остаётся единственным способом
	 * сообщить о состоянии.
	 */
	protected override _hasNativeRequired(): boolean {
		return !this.readonly && this._isNativeTag()
	}

	/** На теге `input` `readonly` нативный вне зависимости от прочего состояния. */
	protected override _hasNativeReadonly(): boolean {
		return this._isNativeTag()
	}

	private _isNativeTag(): boolean {
		return typeof this.tag === 'string' && this.tag.toLowerCase() === 'input'
	}
}
