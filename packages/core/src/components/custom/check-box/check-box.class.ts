import { TInputControl } from '../../base/input-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { ICheckBox, ICheckBoxProps, TCheckBoxEvents } from './types'

export default class TCheckBox
	extends TInputControl<boolean | undefined, ICheckBoxProps, TCheckBoxEvents>
	implements ICheckBox
{
	static override baseClass = 's-check-box'

	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<ICheckBoxProps, 'indeterminate' | 'plain'> = {
		...TInputControl.defaultValues,
		value: false,
		indeterminate: false,
		plain: false,
		variant: 'normal',
	}

	protected _indeterminate!: boolean
	protected _plain!: boolean

	constructor(props: Partial<ICheckBoxProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TCheckBox

		this.value = props.value ?? ctor.defaultValues.value
		this._applyIndeterminate(props.indeterminate ?? ctor.defaultValues.indeterminate)
		this._applyPlain(props.plain ?? ctor.defaultValues.plain)
	}

	/**
	 * Состояние «выбрано частично».
	 *
	 * Скринридеру его сообщает DOM-свойство `indeterminate` вложенного
	 * `<input type="checkbox">`, а не `aria-checked="mixed"`: свойство проводит
	 * разметка, как и `checked`, а `aria-checked` на нативном чекбоксе дублирует
	 * его собственное состояние — поэтому ядро этот атрибут не пишет вовсе.
	 */
	get indeterminate(): boolean {
		return this._indeterminate
	}

	protected _applyIndeterminate(value: boolean) {
		this._classes.toggle(`--indeterminate`, value)

		this._indeterminate = value
	}

	set indeterminate(value: boolean) {
		if (this._indeterminate !== value) {
			this._applyIndeterminate(value)
			this.events.emit('change:indeterminate', value)
		}
	}

	get plain(): boolean {
		return this._plain
	}

	protected _applyPlain(value: boolean) {
		this._classes.toggle(`--plain`, value)

		this._plain = value
	}

	set plain(value: boolean) {
		if (this._plain !== value) {
			this._applyPlain(value)
			this.events.emit('change:plain', value)
		}
	}

	/**
	 * Переключает состояние чекбокса
	 * Если был indeterminate, то станет true
	 * Если было true, то станет false
	 */
	toggle(): void {
		if (this.indeterminate) {
			this.indeterminate = false
			this.value = true
		} else {
			this.value = this.value === true ? false : true
		}
	}

	getProps(): ICheckBoxProps {
		return {
			...super.getProps(),
			indeterminate: this.indeterminate,
			plain: this.plain,
		}
	}

	/**
	 * `aria` стоит на вложенном `<input type="checkbox">`, а не на корне:
	 * `disabled` у него нативный, и `aria-disabled` рядом был бы дублем.
	 */
	protected override get _ariaTag(): string {
		return 'input'
	}

	/**
	 * Рендерится в `<input type="checkbox">` — `required` у него нативный,
	 * дублировать в ARIA не нужно.
	 *
	 * HTML не знает `readonly` у чекбокса — браузер его молча игнорирует,
	 * поэтому `aria-readonly` остаётся единственным способом сообщить о нём.
	 */
	protected override _syncInputAccessibility(): void {
		this._aria.add('aria-required', null)
		this._aria.add('aria-readonly', this.readonly ? 'true' : null)
	}
}
