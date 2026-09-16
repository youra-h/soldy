import { TInputControl } from '../../base/input-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { IInput, IInputProps, TInputEvents } from './types'

export class TInput extends TInputControl<string, IInputProps, TInputEvents> implements IInput {
	static override baseClass = 's-input'

	static defaultValues: typeof TInputControl.defaultValues & TDefaultValues<IInputProps, 'placeholder'> = {
		...TInputControl.defaultValues,
		placeholder: '',
	}

	protected _placeholder!: string

	constructor(props: Partial<IInputProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TInput

		this._applyPlaceholder(props.placeholder ?? ctor.defaultValues.placeholder)
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
		this.events.emit('change:placeholder', value)
	}

	/**
	 * `aria` поля стоит на вложенном `<input>`, а не на корне: корень Input —
	 * обёртка со слотами `leading`/`trailing`, а тег поля внутри неё
	 * фиксирован.
	 */
	protected override get _ariaTag(): string {
		return 'input'
	}

	/**
	 * На теге `input` `required` и `readonly` нативные — браузер сам сообщает
	 * о них скринридеру, дублировать в ARIA не нужно.
	 *
	 * Исключение — `required` на `readonly`-поле: браузер такое поле не
	 * валидирует, нативный `required` на нём бессмыслен, и без явного
	 * `aria-required` состояние останется немым.
	 *
	 * Решает тег элемента с `aria` (`_ariaTag`), а не `tag` корня: дубль встал
	 * бы рядом с нативным атрибутом на том же вложенном `<input>`.
	 */
	protected override _syncInputAccessibility(): void {
		const isNativeTag = this._ariaTag.toLowerCase() === 'input'

		this._aria.add(
			'aria-required',
			this.required && (!isNativeTag || this.readonly) ? 'true' : null,
		)

		this._aria.add('aria-readonly', this.readonly && !isNativeTag ? 'true' : null)
	}
}
