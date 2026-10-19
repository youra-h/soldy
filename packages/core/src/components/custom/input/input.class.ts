import { TClearable } from '../../base/clearable'
import type { TDefaultValues } from '../../base/component'
import { syncTextFieldAria } from './aria'
import type { IInput, IInputProps, TInputEvents } from './types'

export class TInput extends TClearable<string, IInputProps, TInputEvents> implements IInput {
	static override baseClass = 'so-input'

	static defaultValues: typeof TClearable.defaultValues &
		TDefaultValues<IInputProps, 'placeholder'> = {
		...TClearable.defaultValues,
		placeholder: '',
	}

	protected _placeholder!: string

	constructor(props: Partial<IInputProps> = {}) {
		super(props)

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
	 * Очищенное текстовое поле — пустая строка. Пишется сеттером: запись можно
	 * поправить или отменить в `change:value:before`, как правку пользователя.
	 */
	protected override _clearValue(): void {
		this.value = ''
	}

	/**
	 * На теге `input` `required` и `readonly` нативные — дублей в ARIA нет,
	 * кроме `required` на `readonly`-поле. Правило одно с полем числа —
	 * `syncTextFieldAria`.
	 */
	protected override _syncInputAccessibility(): void {
		syncTextFieldAria(this._aria, this._ariaTag, this.required, this.readonly)
	}
}
