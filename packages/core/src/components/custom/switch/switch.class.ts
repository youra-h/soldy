import { TInputControl } from '../../base/input-control'
import type { IComponentOptions, TDefaultValues } from '../../base/component'
import type { ISwitch, ISwitchProps, TSwitchEvents } from './types'

/**
 * Переключатель — паттерн Switch из WAI-ARIA APG, вариант на
 * `input[type="checkbox"]`.
 *
 * `aria` стоит на вложенном `<input>`, и ядро пишет туда `role="switch"`:
 * это единственное, что переключатель знает о себе сверх чекбокса, — без
 * роли скринридер объявил бы «флажок, отмечен» вместо «переключатель, вкл».
 *
 * `aria-checked` не пишется намеренно. Состояние нативного чекбокса сообщает
 * `checked`, который проводит разметка, и APG для switch на
 * `input[type="checkbox"]` требует именно его: `aria-checked` рядом был бы
 * дублем того же состояния вторым путём.
 */
export default class TSwitch
	extends TInputControl<boolean | undefined, ISwitchProps, TSwitchEvents>
	implements ISwitch
{
	static override baseClass = 's-switch'

	static defaultValues: typeof TInputControl.defaultValues & TDefaultValues<ISwitchProps> = {
		...TInputControl.defaultValues,
		value: false,
		variant: 'normal',
	}

	constructor(props: Partial<ISwitchProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TSwitch

		this.value = props.value ?? ctor.defaultValues.value

		this._aria.add('role', 'switch')
	}

	/**
	 * Переключает состояние компонента
	 * Если было true, то станет false
	 */
	toggle(): void {
		this.value = this.value === true ? false : true
	}

	getProps(): ISwitchProps {
		return {
			...super.getProps(),
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
