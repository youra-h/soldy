import React, { useRef, useState, useEffect, useCallback } from 'react'
import { TComponentView, type IComponentView } from '@soldy/core'
import type { IComponentViewState } from './sync'

export interface ComponentViewProps {
	ctrl?: IComponentView
	tag?: string | object
	rendered?: boolean
	visible?: boolean
	children?: React.ReactNode

	onBeforeShow?: () => void
	onAfterShow?: () => void
	onBeforeHide?: () => void
	onAfterHide?: () => void
	onShow?: (instance: IComponentView) => void
	onHide?: (instance: IComponentView) => void
	onChangeVisible?: (value: boolean) => void
	onChangeRendered?: (value: boolean) => void
	onReady?: (payload: { element: HTMLElement; instance: IComponentView; plugins: any }) => void
}

export function ComponentView({
	ctrl: externalCtrl,
	tag: tagProp,
	rendered: renderedProp,
	visible: visibleProp,
	children,
	...eventHandlers
}: ComponentViewProps) {
	const instanceRef = useRef<IComponentView | null>(null)
	if (!instanceRef.current) {
		instanceRef.current = externalCtrl ?? new TComponentView({
			rendered: renderedProp ?? true,
			visible: visibleProp ?? true,
			tag: tagProp ?? 'div',
		})
	}
	const instance = instanceRef.current

	const [state, setState] = useState<IComponentViewState>(() => ({
		rendered: instance.rendered,
		visible: instance.visible,
		present: instance.present,
		tag: instance.tag,
		classes: instance.classes.list,
	}))

	const onEvent = useCallback((name: string, ...args: any[]) => {
		const handler = (eventHandlers as Record<string, any>)[name]
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

	useEffect(() => {
		if (tagProp !== undefined && tagProp !== instance.tag) {
			instance.tag = tagProp
			setState(prev => ({ ...prev, tag: tagProp, classes: instance.classes.list }))
		}
	}, [tagProp])

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
		sync('change:visible', (value: boolean) => {
			onEvent('change:visible', value)
			setState(prev => ({ ...prev, visible: value }))
		})
		sync('change:rendered', (value: boolean) => {
			onEvent('change:rendered', value)
			setState(prev => ({ ...prev, rendered: value }))
		})

		return () => unsubs.forEach(fn => fn())
	}, [instance, onEvent])

	if (!state.rendered) return null

	const Tag = typeof state.tag === 'string' ? state.tag : 'div'

	return React.createElement(
		Tag,
		{
			className: state.classes.join(' '),
			style: { display: state.visible ? undefined : 'none' },
		},
		children,
	)
}
