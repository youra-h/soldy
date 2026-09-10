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
	 * На теге `input` `required` и `readonly` нативные — браузер сам сообщает
	 * о них скринридеру, дублировать в ARIA не нужно.
	 *
	 * Исключение — `required` на `readonly`-поле: браузер такое поле не
	 * валидирует, нативный `required` на нём бессмыслен, и без явного
	 * `aria-required` состояние останется немым.
	 */
	protected override _syncInputAccessibility(): void {
		const isNativeTag = typeof this.tag === 'string' && this.tag.toLowerCase() === 'input'

		this._aria.add(
			'aria-required',
			this.required && (!isNativeTag || this.readonly) ? 'true' : null,
		)

		this._aria.add('aria-readonly', this.readonly && !isNativeTag ? 'true' : null)
	}
}
