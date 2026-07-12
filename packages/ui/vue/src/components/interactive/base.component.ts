import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
import { type IInteractive, type IInteractiveProps, TInteractive } from '@soldy/core'
import {
	BaseComponentView,
	emitsComponentView,
	propsComponentView,
	syncComponentView,
	type IComponentViewState,
} from '../component-view'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { useSyncProps } from '../../composables/useSyncProps'

export const emitsInteractive: TEmits = [
	...emitsComponentView,
	'changeDisabled',
	'update:disabled',
	'changeFocused',
	'update:focused',
	'focused',
] as const

export const propsInteractive: TProps = {
	...propsComponentView,
	disabled: {
		type: Boolean as PropType<IInteractiveProps['disabled']>,
		default: TInteractive.defaultValues.disabled,
	},
	focused: {
		type: Boolean as PropType<IInteractiveProps['focused']>,
		default: TInteractive.defaultValues.focused,
	},
}

export default {
	name: 'BaseInteractive',
	extends: BaseComponentView,
	emits: emitsInteractive,
	props: propsInteractive,
}

export interface IInteractiveState extends IComponentViewState {
	disabled: Ref<boolean>
	focused: Ref<boolean>
}

/**
 * Bind props to instance properties.
 * @param props
 * @param instance
 */
export function syncInteractive(
	options: ISyncComponentOptions<IInteractiveProps, IInteractive>,
): IInteractiveState {
	const syncProps = syncComponentView(options)

	const { instance, props, emit, plugins } = options

	// Пробрасываем события core-инстанса наружу (Vue events).
	instance.events.on('changeDisabled' as any, (value: boolean) => {
		emit?.('changeDisabled', value)
		emit?.('update:disabled', value)
	})

	instance.events.on('changeFocused' as any, (value: boolean) => {
		emit?.('changeFocused', value)
		emit?.('focused', value)
		emit?.('update:focused', value)
	})

	track(props, 'disabled', (value) => {
		if (value !== undefined && value !== instance.disabled) {
			instance.disabled = value
		}
	})

	track(props, 'focused', (value) => {
		if (value !== undefined && value !== instance.focused) {
			instance.focused = value
		}
	})

	const sync: Record<string, any> = {
		...syncProps,
		...useSyncProps(instance.events as any, {
			disabled: () => instance.disabled,
			focused: () => instance.focused,
		}),
	}

	return sync as IInteractiveState
}
