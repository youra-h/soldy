import { type PropType, type Ref } from 'vue'
import { type ICheckBoxProps, type ICheckBox, TCheckBox, track } from '@soldy/core'
import {
	BaseInputControl,
	emitsInputControl,
	propsInputControl,
	syncInputControl,
	type IInputControlState,
} from '../input-control'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types/common'
import { Icon } from '../icon'
import { useSyncProps } from '../../composables/useSyncProps'
import { useInheritProps } from '../../composables/useInheritProps'

export const emitsCheckBox: TEmits = [
	...emitsInputControl,
	'update:indeterminate',
	'changeIndeterminate',
	'update:plain',
	'changePlain',
] as const

export const propsCheckBox: TProps = {
	...useInheritProps(propsInputControl, TCheckBox),
	indeterminate: {
		type: Boolean as PropType<ICheckBoxProps['indeterminate']>,
		default: TCheckBox.defaultValues.indeterminate,
	},
	plain: {
		type: Boolean as PropType<ICheckBoxProps['plain']>,
		default: TCheckBox.defaultValues.plain,
	},
}

export default {
	name: 'BaseCheckBox',
	extends: BaseInputControl,
	components: { Icon },
	emits: emitsCheckBox,
	props: propsCheckBox,
}

/**
 * Bind props to instance properties.
 * @param props
 * @param instance
 */
export interface ICheckBoxState extends IInputControlState<boolean | undefined> {
	indeterminate: Ref<boolean>
	plain: Ref<boolean>
}

export function syncCheckBox(
	options: ISyncComponentOptions<ICheckBoxProps, ICheckBox>,
): ICheckBoxState {
	const syncProps = syncInputControl(options)

	const { instance, props, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on('changeIndeterminate' as any, (value: boolean) => {
		emit?.('changeIndeterminate', value)
		emit?.('update:indeterminate', value)
	})

	instance.events.on('changePlain' as any, (value: boolean) => {
		emit?.('changePlain', value)
		emit?.('update:plain', value)
	})

	track(props, 'indeterminate', (value) => {
		if (value !== undefined && value !== instance.indeterminate) {
			instance.indeterminate = value
		}
	})

	track(props, 'plain', (value) => {
		if (value !== undefined && value !== instance.plain) {
			instance.plain = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			indeterminate: () => instance.indeterminate,
			plain: () => instance.plain,
		}),
	}
}
