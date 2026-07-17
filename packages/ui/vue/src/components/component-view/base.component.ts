import { type Ref } from 'vue'
import { type IComponentView, TComponentView } from '@soldy/core'
import type { TEmits, TProps } from '../../types'
import { BaseComponent, type IComponentState } from '../component'
import { useSyncProps } from '../../composables/useSyncProps'
import { useEmits, useProps } from '../../adapter'
import { componentViewModel } from './component-view.model'

export const emitsComponentView: TEmits = useEmits(componentViewModel) as unknown as TEmits

export const propsComponentView: TProps = useProps(componentViewModel, TComponentView) as TProps

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
