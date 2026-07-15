import type { PropType, Ref } from 'vue'
import { useSyncProps } from '../../composables/useSyncProps'
import { type IComponentView, type IComponentViewProps, TComponentView } from '@soldy/core'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { type IPluginBundle, TElementPlugin } from '@soldy/plugins'
import {
	BaseComponent,
	emitsComponent,
	propsComponent,
	syncComponent,
	type IComponentState,
} from '../component'
import { useInheritProps } from '../../composables/useInheritProps'
import { track } from '@soldy/schema'

export const emitsComponentView: TEmits = [...emitsComponent, 'ready'] as const

export const propsComponentView: TProps = {
	...useInheritProps(propsComponent, TComponentView),
	plugins: {
		type: Object as PropType<IPluginBundle>,
	},
	tag: {
		type: [Object, String] as PropType<IComponentViewProps['tag']>,
		default: TComponentView.defaultValues.tag,
	}
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

/** @deprecated Использовать setup.component.ts с vueAdapter */
export function _syncComponentView(
	options: ISyncComponentOptions<IComponentViewProps, IComponentView>,
): IComponentViewState {
	const syncProps = syncComponent(options)

	const { props, instance, plugins, emit } = options

	plugins.get(TElementPlugin)!.events.on('ready', ({ element }: { element: HTMLElement }) => {
		const payload = { element, instance, plugins }
		emit?.('ready', payload)
	})

	track(props, 'tag', (value) => {
		if (value !== undefined && value !== instance.tag) {
			instance.tag = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events, {
			rendered: () => instance.rendered,
			visible: () => instance.visible,
			present: () => instance.present,
			tag: () => instance.tag,
			classes: () => instance.classes.list,
		}),
	}
}
