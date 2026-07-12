import { type IComponentView, type IComponentViewProps, track } from '@soldy/core'
import type { IComponentState } from '../component'

export interface IComponentViewState extends IComponentState {
	tag: string | object
	classes: string[]
}

/**
 * Синхронизация core-инстанса TComponentView с React-компонентом.
 * Базовый syncComponent расширяется tag и classes.
 */
export function syncComponentView(
	props: IComponentViewProps,
	instance: IComponentView,
	onEvent: (name: string, ...args: any[]) => void,
): IComponentViewState {
	// Подписка на события из syncComponent (через chain наследования)
	instance.events.on('ready' as any, ({ element, plugins }: any) => {
		onEvent('ready', { element, instance, plugins })
	})

	instance.events.on('changeTag' as any, (value: string | object) => {
		onEvent('changeTag', value)
	})

	track(props, 'rendered', (value) => {
		if (value !== undefined) instance.rendered = value
	})
	track(props, 'visible', (value) => {
		if (value !== undefined) instance.visible = value
	})
	track(props, 'tag', (value) => {
		if (value !== undefined && value !== instance.tag) {
			instance.tag = value
		}
	})

	return {
		rendered: instance.rendered,
		visible: instance.visible,
		present: instance.present,
		tag: instance.tag,
		classes: instance.classes.list,
	}
}
