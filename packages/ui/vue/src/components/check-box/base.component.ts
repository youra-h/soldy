import { type PropType, watch, type Ref } from 'vue'
import { type ICheckBoxProps, type ICheckBox, TCheckBox } from '@soldy/core'
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
	'change:indeterminate',
	'update:plain',
	'change:plain',
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
 * Bind props to ctrl properties.
 * @param props
 * @param ctrl
 */
export interface ICheckBoxState extends IInputControlState<boolean | undefined> {
	indeterminate: Ref<boolean>
	plain: Ref<boolean>
}

export function syncCheckBox(
	options: ISyncComponentOptions<ICheckBoxProps, ICheckBox>,
): ICheckBoxState {
	const syncProps = syncInputControl(options)

	const { ctrl, props, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events)
	ctrl.events.on('change:indeterminate' as any, (value: boolean) => {
		emit?.('change:indeterminate', value)
		emit?.('update:indeterminate', value)
	})

	ctrl.events.on('change:plain' as any, (value: boolean) => {
		emit?.('change:plain', value)
		emit?.('update:plain', value)
	})

	watch<boolean | undefined>(
		() => props.indeterminate,
		(value) => {
			if (value !== undefined && value !== ctrl.indeterminate) {
				ctrl.indeterminate = value
			}
		},
	)

	watch<boolean | undefined>(
		() => props.plain,
		(value) => {
			if (value !== undefined && value !== ctrl.plain) {
				ctrl.plain = value
			}
		},
	)

	return {
		...syncProps,
		...useSyncProps(ctrl.events as any, {
			indeterminate: () => ctrl.indeterminate,
			plain: () => ctrl.plain,
		}),
	}
}
