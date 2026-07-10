import type { PropType, Ref } from 'vue'
import { type IFrameProps, TFrame, type IFrame, type TFramePosition } from '@soldy/core'
import { useSyncProps } from '../../composables/useSyncProps'
import { useInheritProps } from '../../composables/useInheritProps'
import {
	BaseComponent,
	emitsComponent,
	propsComponent,
	syncComponent,
	type IComponentState,
} from '../component'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { TFrameStylePlugin } from '@soldy/plugins'

export const emitsFrame: TEmits = [
	...emitsComponent,
	'change:visible',
	'update:visible',
	'change:x',
	'update:x',
	'change:y',
	'update:y',
	'change:width',
	'update:width',
	'change:height',
	'update:height',
	'change:zIndex',
	'change:position',
	'update:position',
	'beforeShow',
	'beforeHide',
	'show',
	'hide',
] as const

export const propsFrame: TProps = {
	...useInheritProps(propsComponent, TFrame),
	x: {
		type: Number as PropType<IFrameProps['x']>,
		default: TFrame.defaultValues.x,
	},
	y: {
		type: Number as PropType<IFrameProps['y']>,
		default: TFrame.defaultValues.y,
	},
	width: {
		type: [Number, String] as PropType<IFrameProps['width']>,
		default: TFrame.defaultValues.width,
	},
	height: {
		type: [Number, String] as PropType<IFrameProps['height']>,
		default: TFrame.defaultValues.height,
	},
	visible: {
		type: Boolean as PropType<IFrameProps['visible']>,
		default: TFrame.defaultValues.visible,
	},
	position: {
		type: String as PropType<IFrameProps['position']>,
		default: TFrame.defaultValues.position,
	},
}

export default {
	name: 'BaseFrame',
	extends: BaseComponent,
	emits: emitsFrame,
	props: propsFrame,
}

export interface IFrameState extends IComponentState {
	x: Ref<number>
	y: Ref<number>
	styles: Ref<Record<string, string | number>>
	width: Ref<string | number | undefined>
	height: Ref<string | number | undefined>
	position: Ref<TFramePosition>
	target: Ref<string>
}

/**
 * Bind props to ctrl properties.
 * @param options - sync options
 */
export function syncFrame(
	options: ISyncComponentOptions<IFrameProps, IFrame>,
): IFrameState {
	const syncProps = syncComponent(options)

	const { ctrl, emit, plugins } = options

	ctrl.events.on('change:x' as any, (value: number) => {
		emit?.('change:x', value)
		emit?.('update:x', value)
	})
	ctrl.events.on('change:y' as any, (value: number) => {
		emit?.('change:y', value)
		emit?.('update:y', value)
	})
	ctrl.events.on('change:width' as any, (value: number | string) => {
		emit?.('change:width', value)
		emit?.('update:width', value)
	})
	ctrl.events.on('change:height' as any, (value: number | string) => {
		emit?.('change:height', value)
		emit?.('update:height', value)
	})
	ctrl.events.on('change:zIndex' as any, (value: number) => {
		emit?.('change:zIndex', value)
	})
	ctrl.events.on('change:position' as any, (value: TFramePosition) => {
		emit?.('change:position', value)
		emit?.('update:position', value)
	})
	ctrl.events.on('change:target' as any, (value: string) => {
		emit?.('change:target', value)
		emit?.('update:target', value)
	})

	const stylePlugin = plugins.get(TFrameStylePlugin)!

	return {
		...syncProps,
		...useSyncProps(ctrl.events as any, {
			x: () => ctrl.x,
			y: () => ctrl.y,
			width: () => ctrl.width,
			height: () => ctrl.height,
			position: () => ctrl.position,
			target: () => ctrl.target,
		}),
		...useSyncProps(stylePlugin.events as any, {
			styles: () => stylePlugin.styles,
		}),
	}
}
