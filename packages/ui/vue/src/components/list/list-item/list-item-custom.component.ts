import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
import {
	type IListItemCustom,
	type IListItemCustomProps,
	TListItemCustom,
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

export const emitsListItemCustom: TEmits = [
	...emitsValueControl,
	'changeText',
	'update:text',
	'changeWordWrap',
	'update:wordWrap',
] as const

export const propsListItemCustom: TProps = {
	...propsValueControl,
	tag: {
		type: [Object, String] as PropType<IListItemCustomProps['tag']>,
		default: TListItemCustom.defaultValues.tag,
	},
	text: {
		type: String as PropType<IListItemCustomProps['text']>,
		default: TListItemCustom.defaultValues.text,
	},
	wordWrap: {
		type: Boolean as PropType<IListItemCustomProps['wordWrap']>,
		default: TListItemCustom.defaultValues.wordWrap,
	},
}

export default {
	name: 'BaseListItemCustom',
	extends: BaseValueControl,
	emits: emitsListItemCustom,
	props: propsListItemCustom,
}

export interface IListItemCustomState extends IValueControlState {
	text: Ref<string>
	wordWrap: Ref<boolean | undefined>
}

export function syncListItemCustom(
	options: ISyncComponentOptions<IListItemCustomProps, IListItemCustom>,
): IListItemCustomState {
	const syncProps = syncValueControl(options)

	const { props, instance, emit } = options

	instance.events.on('changeText', (payload: TValuePayload<string>) => {
		emit?.('changeText', payload)
		emit?.('update:text', payload.newValue)
	})

	instance.events.on('changeWordWrap', (value: boolean) => {
		emit?.('changeWordWrap', value)
		emit?.('update:wordWrap', value)
	})

	track(props, 'text', (value) => {
		if (value !== undefined && value !== instance.text) {
			instance.text = value
		}
	})

	track(props, 'wordWrap', (value) => {
		if (value !== undefined && value !== instance.wordWrap) {
			instance.wordWrap = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			text: () => instance.text,
			wordWrap: () => instance.wordWrap,
		}),
	}
}
