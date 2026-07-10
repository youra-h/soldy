import type { PropType, Ref } from 'vue'
import { watch } from 'vue'
import {
	type ITabItemCustom,
	type ITabItemCustomProps,
	TTabItemCustom,
	type TValuePayload,
} from '@soldy/core'
import {
	BaseValueControl,
	emitsValueControl,
	propsValueControl,
	syncValueControl,
	type IValueControlState,
} from '../../value-control'
import type { TEmits, TProps, ISyncComponentOptions } from '../../../types'
import { useSyncProps } from '../../../composables/useSyncProps'

export const emitsTabItemCustom: TEmits = [
	...emitsValueControl,
	'change:text',
	'update:text',
	'change:closable',
	'update:closable',
	'close',
] as const

export const propsTabItemCustom: TProps = {
	...propsValueControl,
	tag: {
		type: [Object, String] as PropType<ITabItemCustomProps['tag']>,
		default: TTabItemCustom.defaultValues.tag,
	},
	text: {
		type: String as PropType<ITabItemCustomProps['text']>,
		default: TTabItemCustom.defaultValues.text,
	},
	closable: {
		type: Boolean as PropType<ITabItemCustomProps['closable']>,
		default: TTabItemCustom.defaultValues.closable,
	},
}

export default {
	name: 'BaseTabItemCustom',
	extends: BaseValueControl,
	emits: emitsTabItemCustom,
	props: propsTabItemCustom,
}

export interface ITabItemCustomState extends IValueControlState {
	text: Ref<string>
	closable: Ref<boolean | undefined>
}

/**
 * Синхронизация props и событий для TabItemCustom
 */
export function syncTabItemCustom(
	options: ISyncComponentOptions<ITabItemCustomProps, ITabItemCustom>,
) {
	const syncProps = syncValueControl(options)

	const { props, ctrl, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events)
	ctrl.events.on('change:text', (payload: TValuePayload<string>) => {
		emit?.('change:text', payload)
		emit?.('update:text', payload)
	})

	ctrl.events.on('change:closable', (value: boolean | undefined) => {
		emit?.('change:closable', value)
		emit?.('update:closable', value)
	})

	ctrl.events.on('close', () => {
		emit?.('close')
	})

	watch<string | undefined>(
		() => props.text,
		(value) => {
			if (value !== undefined && value !== ctrl.text) {
				ctrl.text = value
			}
		},
	)

	watch<boolean | undefined>(
		() => props.closable,
		(value) => {
			if (value !== undefined && value !== ctrl.closable) {
				ctrl.closable = value
			}
		},
	)

	return {
		...syncProps,
		...useSyncProps(ctrl.events as any, {
			text: () => ctrl.text,
			closable: () => ctrl.closable,
		}),
	}
}
