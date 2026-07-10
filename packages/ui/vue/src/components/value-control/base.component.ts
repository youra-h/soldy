import type { PropType, Ref, UnwrapRef } from 'vue'
import { watch } from 'vue'
import { type IValueControl, type IValueControlProps, TValueControl } from '@soldy/core'
import { BaseControl, emitsControl, propsControl, syncControl, type IControlState } from '../control'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { useSyncProps } from '../../composables/useSyncProps'
import { useInheritProps } from '../../composables/useInheritProps'

export const emitsValueControl: TEmits = [
	...emitsControl,
	'change:value',
	'update:value',
	'input:value',
	'input',
	'change:name',
	'update:name',
] as const

export const propsValueControl: TProps = {
	...useInheritProps(propsControl, TValueControl),
	value: {
		type: [String, Number, Boolean, Object, Array] as PropType<any>,
		default: TValueControl.defaultValues.value,
	},
	name: {
		type: String as PropType<IValueControlProps<any>['name']>,
		default: TValueControl.defaultValues.name,
	},
}

export default {
	name: 'BaseValueControl',
	extends: BaseControl,
	emits: emitsValueControl,
	props: propsValueControl,
}

export interface IValueControlState<TValue = any> extends IControlState {
	value: Ref<TValue | UnwrapRef<TValue>>
	name: Ref<string>
}

/**
 * Bind props to ctrl properties.
 * @param props
 * @param ctrl
 */
export function syncValueControl<TValue>(
	options: ISyncComponentOptions<IValueControlProps<TValue>, IValueControl<TValue>>,
): IValueControlState<TValue> {
	const syncProps = syncControl(options)

	const { ctrl, props, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events).
	ctrl.events.on('change:value' as any, (value: TValue) => {
		emit?.('change:value', value)
		emit?.('update:value', value)
	})

	ctrl.events.on('input:value' as any, (value: TValue) => {
		emit?.('input:value', value)
		emit?.('input', value)
	})

	ctrl.events.on('change:name' as any, (value: string) => {
		emit?.('change:name', value)
		emit?.('update:name', value)
	})

	watch(
		() => props.value,
		(value) => {
			if (value !== undefined && value !== ctrl.value) {
				ctrl.value = value as TValue
			}
		},
	)

	watch<string | undefined>(
		() => props.name,
		(value) => {
			if (value !== undefined && value !== ctrl.name) {
				ctrl.name = value
			}
		},
	)

	return {
		...syncProps,
		...useSyncProps(ctrl.events, {
			value: () => ctrl.value,
			name: () => ctrl.name,
		}),
	}
}
