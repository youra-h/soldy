import { useSyncProps } from '../../composables/useSyncProps'
import { type IComponentView, type IComponentViewProps } from '@soldy/core'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types'
import { TElementPlugin } from '@soldy/plugins'
import { componentViewSchema } from '@soldy/schema'
import { schemaToVueEmits, schemaToVueProps } from '../../adapter/schemaToVue'
import { BaseComponent, syncComponent, type IComponentState } from '../component'
import { track } from '@soldy/schema'

export const emitsComponentView: TEmits = schemaToVueEmits(componentViewSchema)

export const propsComponentView: TProps = schemaToVueProps(componentViewSchema, {})

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
export function syncComponentView(
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
