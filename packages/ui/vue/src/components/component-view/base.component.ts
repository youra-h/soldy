import { type PropType, type Ref } from 'vue'
import { type IComponentView, type IComponentViewProps } from '@soldy/core'
import type { TEmits, TProps } from '../../types'
import { BaseComponent, type IComponentState } from '../component'
import { useSyncProps } from '../../composables/useSyncProps'

// ComponentView emits
export const emitsComponentView: TEmits = [
	'created',
	'show',
	'hide',
	'show:before',
	'show:after',
	'hide:before',
	'hide:after',
	'change:rendered',
	'change:visible',
	'change:present',
	'ready',
	'update:rendered',
	'update:visible',
	'update:tag',
	'change:tag',
	'change:classes',
] as const

// ComponentView props
export const propsComponentView: TProps = {
	rendered: {
		type: Boolean as PropType<boolean>,
		default: true,
	},
	visible: {
		type: Boolean as PropType<boolean>,
		default: true,
	},
	tag: {
		type: [String, Object] as PropType<string | object>,
		default: 'div',
	},
	ctrl: {
		type: Object as PropType<IComponentView | undefined>,
		default: undefined,
	},
	plugins: {
		type: Object as PropType<any>,
		default: undefined,
	},
}

export default {
	name: 'BaseComponentView',
	extends: BaseComponent,
	emits: emitsComponentView,
	props: propsComponentView,
}

export interface IComponentViewState extends IComponentState {
	tag: Ref<string | object>
	classes: Ref<string[]>
}

/** @deprecated Использовать setup.component.ts с Runtime */
export function syncComponentView(
	options: any,
): IComponentViewState {
	const { instance } = options

	return {
		rendered: useSyncProps(instance.events, {
			rendered: () => instance.rendered,
		}).rendered,
		visible: useSyncProps(instance.events, {
			visible: () => instance.visible,
		}).visible,
		present: useSyncProps(instance.events, {
			present: () => instance.present,
		}).present,
		tag: useSyncProps(instance.events, {
			tag: () => instance.tag,
		}).tag,
		classes: useSyncProps(instance.events, {
			classes: () => instance.classes.list,
		}).classes,
	}
}
