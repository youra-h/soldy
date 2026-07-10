import type { PropType, Ref } from 'vue'
import { watch } from 'vue'
import { type IControl, type IControlProps, TControl } from '@soldy/core'
import {
	BaseStylable,
	emitsStylable,
	propsStylable,
	syncStylable,
	type IStylableState,
} from '../stylable'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { useSyncProps } from '../../composables/useSyncProps'
import { useInheritProps } from '../../composables/useInheritProps'

export const emitsControl: TEmits = [
	...emitsStylable,
	'change:disabled',
	'update:disabled',
	'change:focused',
	'update:focused',
	'focused',
] as const

export const propsControl: TProps = {
	...useInheritProps(propsStylable, TControl),
	disabled: {
		type: Boolean as PropType<IControlProps['disabled']>,
		default: TControl.defaultValues.disabled,
	},
	focused: {
		type: Boolean as PropType<IControlProps['focused']>,
		default: TControl.defaultValues.focused,
	},
}

export default {
	name: 'BaseControl',
	extends: BaseStylable,
	emits: emitsControl,
	props: propsControl,
}

export interface IControlState extends IStylableState {
	disabled: Ref<boolean>
	focused: Ref<boolean>
}

/**
 * Bind props to ctrl properties.
 * @param props
 * @param ctrl
 */
export function syncControl(
	options: ISyncComponentOptions<IControlProps, IControl>,
): IControlState {
	const syncProps = syncStylable(options)

	const { ctrl, props, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events).
	ctrl.events.on('change:disabled' as any, (value: boolean) => {
		emit?.('change:disabled', value)
		emit?.('update:disabled', value)
	})

	ctrl.events.on('change:focused' as any, (value: boolean) => {
		emit?.('change:focused', value)
		emit?.('focused', value)
		emit?.('update:focused', value)
	})

	watch<boolean | undefined>(
		() => props.disabled,
		(value) => {
			if (value !== undefined && value !== ctrl.disabled) {
				ctrl.disabled = value
			}
		},
	)

	watch<boolean | undefined>(
		() => props.focused,
		(value) => {
			if (value !== undefined && value !== ctrl.focused) {
				ctrl.focused = value
			}
		},
	)

	const sync: Record<string, any> = {
		...syncProps,
		...useSyncProps(ctrl.events as any, {
			disabled: () => ctrl.disabled,
			focused: () => ctrl.focused,
		}),
	}

	return sync as IControlState
}
