import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
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
	'changeText',
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

	const { props, instance, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on('changeText', (payload: TValuePayload<string>) => {
		emit?.('changeText', payload)
		emit?.('update:text', payload)
	})

	instance.events.on('change:closable', (value: boolean | undefined) => {
		emit?.('change:closable', value)
		emit?.('update:closable', value)
	})

	instance.events.on('close', () => {
		emit?.('close')
	})

	track(props, 'text', (value) => {
		if (value !== undefined && value !== instance.text) {
			instance.text = value
		}
	})

	track(props, 'closable', (value) => {
		if (value !== undefined && value !== instance.closable) {
			instance.closable = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			text: () => instance.text,
			closable: () => instance.closable,
		}),
	}
}
