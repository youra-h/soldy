import { TInputControl } from '../../base/input-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { ICheckBox, ICheckBoxProps, TCheckBoxEvents, TCheckBoxView } from './types'

/**
 * Чекбокс — нативный `input[type="checkbox"]` внутри корня.
 *
 * Корень — `span` (`tag`): чекбокс кладут в подпись `Label`, а внутри `label`
 * HTML разрешает только строчную разметку. Размер корню задаёт тема.
 */
export default class TCheckBox
	extends TInputControl<boolean | undefined, ICheckBoxProps, TCheckBoxEvents>
	implements ICheckBox
{
	static override baseClass = 's-check-box'

	static defaultValues: typeof TInputControl.defaultValues &
		TDefaultValues<ICheckBoxProps, 'indeterminate', 'view'> = {
		...TInputControl.defaultValues,
		tag: 'span',
		value: false,
		indeterminate: false,
		view: undefined,
	}

	protected _indeterminate!: boolean
	protected _view: TCheckBoxView | undefined

	constructor(props: Partial<ICheckBoxProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TCheckBox

		this.value = props.value ?? ctor.defaultValues.value
		this._applyIndeterminate(props.indeterminate ?? ctor.defaultValues.indeterminate)
		this._applyView(props.view ?? ctor.defaultValues.view)
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

	get view(): TCheckBoxView | undefined {
		return this._view
	}

	/** Модификатор вида — с префиксом `--view-`; `swap` пропускает пустое значение. */
	protected _applyView(newValue: TCheckBoxView | undefined, oldValue?: TCheckBoxView) {
		this._classes.swap({
			prefix: '--view-',
			oldValue,
			newValue,
		})

		this._view = newValue
	}

	set view(value: TCheckBoxView | undefined) {
		if (this._view === value) return

		this._applyView(value, this._view)
		this.events.emit('change:view', value)
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
			view: this.view,
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
