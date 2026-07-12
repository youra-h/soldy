import React, { useRef, useState, useEffect, useCallback } from 'react'
import { TComponent, type IComponent } from '@soldy/core'
import type { IComponentState } from './sync'

export interface ComponentProps {
	ctrl?: IComponent
	rendered?: boolean
	visible?: boolean
	children?: React.ReactNode

	onBeforeShow?: () => void
	onAfterShow?: () => void
	onBeforeHide?: () => void
	onAfterHide?: () => void
	onShow?: (instance: IComponent) => void
	onHide?: (instance: IComponent) => void
	onChangeVisible?: (value: boolean) => void
	onChangeRendered?: (value: boolean) => void
}

export function Component({
	ctrl: externalCtrl,
	rendered: renderedProp,
	visible: visibleProp,
	children,
	...eventHandlers
}: ComponentProps) {
	const instanceRef = useRef<IComponent | null>(null)
	if (!instanceRef.current) {
		instanceRef.current = externalCtrl ?? new TComponent({
			rendered: renderedProp ?? true,
			visible: visibleProp ?? true,
		})
	}
	const instance = instanceRef.current

	const [state, setState] = useState<IComponentState>(() => ({
		rendered: instance.rendered,
		visible: instance.visible,
		present: instance.present,
	}))

	const onEvent = useCallback((name: string, ...args: any[]) => {
		const handler = (eventHandlers as Record<string, any>)[name] as ((...a: any[]) => void) | undefined
		handler?.(...args)
	}, [eventHandlers])

	// Синхронизация props → instance через useEffect
	useEffect(() => {
		if (renderedProp !== undefined && renderedProp !== instance.rendered) {
			instance.rendered = renderedProp
			setState(prev => ({ ...prev, rendered: renderedProp }))
		}
	}, [renderedProp])

	useEffect(() => {
		if (visibleProp !== undefined && visibleProp !== instance.visible) {
			instance.visible = visibleProp
			setState(prev => ({ ...prev, visible: visibleProp }))
		}
	}, [visibleProp])

	// Подписка на события core-инстанса
	useEffect(() => {
		const unsubs: (() => void)[] = []
		const sync = (name: string, cb: (...args: any[]) => void) => {
			instance.events.on(name as any, cb)
			unsubs.push(() => instance.events.off(name as any, cb))
		}

		sync('beforeShow', () => onEvent('beforeShow'))
		sync('afterShow', () => onEvent('afterShow'))
		sync('beforeHide', () => onEvent('beforeHide'))
		sync('afterHide', () => onEvent('afterHide'))
		sync('show', () => onEvent('show', instance))
		sync('hide', () => onEvent('hide', instance))
		sync('changeVisible', (value: boolean) => {
			onEvent('changeVisible', value)
			setState(prev => ({ ...prev, visible: value }))
		})
		sync('changeRendered', (value: boolean) => {
			onEvent('changeRendered', value)
			setState(prev => ({ ...prev, rendered: value }))
		})

		return () => unsubs.forEach(fn => fn())
	}, [instance, onEvent])

	if (!state.rendered) return null

	return (
		<div
			style={{ display: state.visible ? undefined : 'none' }}
			data-component="s-component"
		>
			{children}
		</div>
	)
}
