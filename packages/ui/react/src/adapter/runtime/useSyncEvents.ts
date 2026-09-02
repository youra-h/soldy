/**
 * useSyncEvents — проброс событий из Core наружу через колбэки-пропсы React.
 *
 * - Триггеры свойств (change:visible → onChangeVisible)
 * - Явные события (ready → onReady, element:ready → onElementReady)
 */

import { useLayoutEffect, useRef } from 'react'
import type { IAccessor, IAccessorProp, TDescriptorInspector } from '@soldy/accessor'

export function useSyncEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	props: Record<string, any>,
): void {
	const propsRef = useRef(props)
	propsRef.current = props

	// useLayoutEffect: подписка до первой отрисовки, чтобы не пропустить
	// события, привязанные к DOM (например, `ready` из TElementPlugin через rAF).
	useLayoutEffect(() => {
		const offs: Array<() => void> = []

		// 1. Триггеры свойств
		for (const prop of accessor.getProps(true) as IAccessorProp[]) {
			const eventSource = accessor.getEventSource(prop)

			if (!eventSource) continue

			const exportTriggers = inspector.getExportTriggers(prop)
			const rawTriggers = inspector.getRawTriggers(prop)

			for (let i = 0; i < rawTriggers.length; i++) {
				const eventName = exportTriggers[i]

				const handler = (...args: any[]) => {
					propsRef.current[eventName]?.(...args)
				}

				eventSource.on(rawTriggers[i], handler)
				offs.push(() => eventSource.off(rawTriggers[i], handler))
			}
		}

		// 2. Явные события
		for (const evt of accessor.getEvents()) {
			const eventSource = accessor.getEventSource(evt)

			if (!eventSource) continue

			const eventName = inspector.getExportEventName(evt.name)

			const handler = (...args: any[]) => {
				propsRef.current[eventName]?.(...args)
			}

			eventSource.on(evt.name.name, handler)
			offs.push(() => eventSource.off(evt.name.name, handler))
		}

		return () => offs.forEach((off) => off())
	}, [accessor, inspector])
}
