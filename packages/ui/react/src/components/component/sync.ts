import { type IComponent, type IComponentProps, track } from '@soldy/core'

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
	instance.events.on('beforeShow' as any, () => {
		onEvent('beforeShow')
	})
	instance.events.on('afterShow' as any, () => {
		onEvent('afterShow')
	})
	instance.events.on('beforeHide' as any, () => {
		onEvent('beforeHide')
	})
	instance.events.on('afterHide' as any, () => {
		onEvent('afterHide')
	})
	instance.events.on('show' as any, () => {
		onEvent('show', instance)
	})
	instance.events.on('hide' as any, () => {
		onEvent('hide', instance)
	})
	instance.events.on('changeVisible' as any, (value: boolean) => {
		onEvent('changeVisible', value)
		onEvent('visible', value)
	})
	instance.events.on('changeRendered' as any, (value: boolean) => {
		onEvent('changeRendered', value)
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
