import { TInputControl } from '../../base/input-control'
import type { IComponentOptions } from '../../base/component'
import type { ISwitch, ISwitchProps, TSwitchEvents } from './types'

export default class TSwitch
	extends TInputControl<boolean | undefined, ISwitchProps, TSwitchEvents>
	implements ISwitch {
	static override baseClass = 's-switch'

	static defaultValues: Partial<ISwitchProps> = {
		...TInputControl.defaultValues,
		value: false,
		variant: 'normal',
	}

	constructor(props: Partial<ISwitchProps> = {}, options: IComponentOptions = {}) {
		super(props, options)

		const ctor = new.target as typeof TSwitch

		this.value = props.value ?? (ctor.defaultValues.value as boolean)
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
}
