import { type PropType, watch, type Ref } from 'vue'
import { type IIconProps, TIcon, type TComponentSize, type IIcon, type TValuePayload } from '@soldy/core'
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
	'change:size',
	'update:size',
	'change:width',
	'update:width',
	'change:height',
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
 * Bind props to ctrl properties.
 * @param props
 * @param ctrl
 */
export function syncIcon(options: ISyncComponentOptions<IIconProps, IIcon>): IIconState {
	const syncProps = syncComponentView(options)

	const { ctrl, props, emit, plugins } = options

	// Пробрасываем события core-инстанса наружу (Vue events).
	ctrl.events.on('change:size', (payload: TValuePayload<TComponentSize>) => {
		emit?.('change:size', payload)
		emit?.('update:size', payload)
	})
	ctrl.events.on('change:width' as any, (value: string | number | undefined) => {
		emit?.('change:width', value)
		emit?.('update:width', value)
	})

	ctrl.events.on('change:height' as any, (value: string | number | undefined) => {
		emit?.('change:height', value)
		emit?.('update:height', value)
	})

	watch<TComponentSize | undefined>(
		() => props.size,
		(value) => {
			if (value !== undefined && value !== ctrl.size) {
				ctrl.size = value
			}
		},
	)

	watch<number | string | undefined>(
		() => props.width,
		(value) => {
			if (value !== undefined && value !== ctrl.width) {
				ctrl.width = value
			}
		},
	)

	watch<number | string | undefined>(
		() => props.height,
		(value) => {
			if (value !== undefined && value !== ctrl.height) {
				ctrl.height = value
			}
		},
	)

	const iconPlugin = plugins.get(TIconStylePlugin)!

	return {
		...syncProps,
		...useSyncProps(ctrl.events as any, {
			size: () => ctrl.size,
			width: () => ctrl.width,
			height: () => ctrl.height,
		}),
		...useSyncProps(iconPlugin.events as any, {
			styles: () => iconPlugin.styles,
		}),
	}
}
