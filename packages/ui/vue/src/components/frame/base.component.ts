import type { PropType, Ref } from 'vue'
import { type IFrameProps, TFrame, type IFrame, type TFramePosition, track } from '@soldy/core'
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
	'changeVisible',
	'update:visible',
	'changeX',
	'update:x',
	'changeY',
	'update:y',
	'changeWidth',
	'update:width',
	'changeHeight',
	'update:height',
	'changeZIndex',
	'changePosition',
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
 * Bind props to instance properties.
 * @param options - sync options
 */
export function syncFrame(options: ISyncComponentOptions<IFrameProps, IFrame>): IFrameState {
	const syncProps = syncComponent(options)

	const { props, instance, emit, plugins } = options

	instance.events.on('changeX' as any, (value: number) => {
		emit?.('changeX', value)
		emit?.('update:x', value)
	})
	instance.events.on('changeY' as any, (value: number) => {
		emit?.('changeY', value)
		emit?.('update:y', value)
	})
	instance.events.on('changeWidth' as any, (value: number | string) => {
		emit?.('changeWidth', value)
		emit?.('update:width', value)
	})
	instance.events.on('changeHeight' as any, (value: number | string) => {
		emit?.('changeHeight', value)
		emit?.('update:height', value)
	})
	instance.events.on('changeZIndex' as any, (value: number) => {
		emit?.('changeZIndex', value)
	})
	instance.events.on('changePosition' as any, (value: TFramePosition) => {
		emit?.('changePosition', value)
		emit?.('update:position', value)
	})
	instance.events.on('changeTarget' as any, (value: string) => {
		emit?.('changeTarget', value)
		emit?.('update:target', value)
	})

	track(props, 'x', (value) => {
		if (value !== undefined && value !== instance.x) {
			instance.x = value
		}
	})
	track(props, 'y', (value) => {
		if (value !== undefined && value !== instance.y) {
			instance.y = value
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
	track(props, 'position', (value) => {
		if (value !== undefined && value !== instance.position) {
			instance.position = value
		}
	})

	const stylePlugin = plugins.get(TFrameStylePlugin)!

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			x: () => instance.x,
			y: () => instance.y,
			width: () => instance.width,
			height: () => instance.height,
			position: () => instance.position,
			target: () => instance.target,
		}),
		...useSyncProps(stylePlugin.events as any, {
			styles: () => stylePlugin.styles,
		}),
	}
}
