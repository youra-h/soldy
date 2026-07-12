import type { PropType, Ref } from 'vue'
import { track } from '@soldy/core'
import {
	type ICollapseItemCustom,
	type ICollapseItemCustomProps,
	TCollapseItemCustom,
	type TCollapseArrowPlacement,
	type TCollapseView,
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

export const emitsCollapseItemCustom: TEmits = [
	...emitsValueControl,
	'changeText',
	'update:text',
	'changeArrowPlacement',
	'update:arrowPlacement',
] as const

export const propsCollapseItemCustom: TProps = {
	...propsValueControl,
	tag: {
		type: [Object, String] as PropType<ICollapseItemCustomProps['tag']>,
		default: TCollapseItemCustom.defaultValues.tag,
	},
	text: {
		type: String as PropType<ICollapseItemCustomProps['text']>,
		default: TCollapseItemCustom.defaultValues.text,
	},
	arrowPlacement: {
		type: String as PropType<ICollapseItemCustomProps['arrowPlacement']>,
		default: TCollapseItemCustom.defaultValues.arrowPlacement,
	},
}

export default {
	name: 'BaseCollapseItemCustom',
	extends: BaseValueControl,
	emits: emitsCollapseItemCustom,
	props: propsCollapseItemCustom,
}

export interface ICollapseItemCustomState extends IValueControlState {
	text: Ref<string>
	arrowPlacement: Ref<TCollapseArrowPlacement>
	view: Ref<TCollapseView>
}

export function syncCollapseItemCustom(
	options: ISyncComponentOptions<ICollapseItemCustomProps, ICollapseItemCustom>,
): ICollapseItemCustomState {
	const syncProps = syncValueControl(options)

	const { props, instance, emit } = options

	instance.events.on('changeText', (payload: TValuePayload<string>) => {
		emit?.('changeText', payload)
		emit?.('update:text', payload.newValue)
	})

	instance.events.on('changeArrowPlacement', (value: TCollapseArrowPlacement) => {
		emit?.('changeArrowPlacement', value)
		emit?.('update:arrowPlacement', value)
	})

	track(props, 'text', (value) => {
		if (value !== undefined && value !== instance.text) {
			instance.text = value
		}
	})

	track(props, 'arrowPlacement', (value) => {
		if (value !== undefined && value !== instance.arrowPlacement) {
			instance.arrowPlacement = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			text: () => instance.text,
			arrowPlacement: () => instance.arrowPlacement,
			view: () => instance.view,
		}),
	}
}
