import { type PropType, type Ref } from 'vue'
import { type IIconProps, TIcon, type TComponentSize, type IIcon, type TValuePayload, track } from '@soldy/core'
import {
	ComponentView,
	emitsComponentView,
	propsComponentView,
	syncComponentView,
	type IComponentViewState,
} from '../component-view'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types/common'
import { useSyncProps } from '../../composables/useSyncProps'
import { useEventState } from '../../composables/useEventState'
import { useInheritProps } from '../../composables/useInheritProps'
import { TIconStylePlugin } from '@soldy/plugins'

export const emitsIcon: TEmits = [
	...emitsComponentView,
	'changeSize',
	'update:size',
	'changeWidth',
	'update:width',
	'changeHeight',
	'update:height',
] as const

export const propsIcon: TProps = {
	...useInheritProps(propsComponentView, TIcon),
	size: {
		type: String as PropType<IIconProps['size']>,
		default: TIcon.defaultValues.size,
	},
	width: {
		type: [Number, String] as PropType<IIconProps['width']>,
		default: TIcon.defaultValues.width,
	},
	height: {
		type: [Number, String] as PropType<IIconProps['height']>,
		default: TIcon.defaultValues.height,
	},
}

export default {
	name: 'BaseIcon',
	extends: ComponentView,
	emits: emitsIcon,
	props: propsIcon,
}

export interface IIconState extends IComponentViewState {
	size: Ref<TComponentSize>
	width: Ref<string | number | undefined>
	height: Ref<string | number | undefined>
	styles: Ref<Record<string, string | number>>
}

/**
 * Bind props to instance properties.
 * @param props
 * @param instance
 */
export function syncIcon(options: ISyncComponentOptions<IIconProps, IIcon>): IIconState {
	const syncProps = syncComponentView(options)

	const { instance, props, emit, plugins } = options

	// Пробрасываем события core-инстанса наружу (Vue events).
	instance.events.on('changeSize', (payload: TValuePayload<TComponentSize>) => {
		emit?.('changeSize', payload)
		emit?.('update:size', payload)
	})
	instance.events.on('changeWidth' as any, (value: string | number | undefined) => {
		emit?.('changeWidth', value)
		emit?.('update:width', value)
	})

	instance.events.on('changeHeight' as any, (value: string | number | undefined) => {
		emit?.('changeHeight', value)
		emit?.('update:height', value)
	})

	track(props, 'size', (value) => {
		if (value !== undefined && value !== instance.size) {
			instance.size = value
		}
	})

	track(props, 'width', (value) => {
		if (value !== undefined && value !== instance.width) {
			instance.width = value
		}
	})

	track(props, 'height', (value) => {
		if (value !== undefined && value !== instance.height) {
			instance.height = value
		}
	})

	const iconPlugin = plugins.get(TIconStylePlugin)!

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			size: () => instance.size,
			width: () => instance.width,
			height: () => instance.height,
		}),
		...useSyncProps(iconPlugin.events as any, {
			styles: () => iconPlugin.styles,
		}),
	}
}
