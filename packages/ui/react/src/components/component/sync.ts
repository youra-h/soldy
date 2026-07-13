import { type IComponent, type IComponentProps } from '@soldy/core'

export interface IComponentState {
	rendered: boolean
	visible: boolean
	present: boolean
}

/**
 * Синхронизация core-инстанса с React-компонентом.
 * Подписывается на события, синхронизирует props → instance через track.
 * Вызывает onEvent при изменении состояния.
 */
export function syncComponent(
	props: IComponentProps,
	instance: IComponent,
	onEvent: (name: string, ...args: any[]) => void,
): IComponentState {
	instance.events.on('show:before' as any, () => {
		onEvent('show:before')
	})
	instance.events.on('show:after' as any, () => {
		onEvent('show:after')
	})
	instance.events.on('hide:before' as any, () => {
		onEvent('hide:before')
	})
	instance.events.on('hide:after' as any, () => {
		onEvent('hide:after')
	})
	instance.events.on('show' as any, () => {
		onEvent('show', instance)
	})
	instance.events.on('hide' as any, () => {
		onEvent('hide', instance)
	})
	instance.events.on('change:visible' as any, (value: boolean) => {
		onEvent('change:visible', value)
		onEvent('visible', value)
	})
	instance.events.on('change:rendered' as any, (value: boolean) => {
		onEvent('change:rendered', value)
		onEvent('rendered', value)
	})

	track(props, 'rendered', (value) => {
		if (value !== undefined) instance.rendered = value
	})
	track(props, 'visible', (value) => {
		if (value !== undefined) instance.visible = value
	})

	return {
		rendered: instance.rendered,
		visible: instance.visible,
		present: instance.present,
	}
}
