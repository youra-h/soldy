/**
 * useSyncEvents — проброс событий из Core в Angular EventEmitter'ы.
 *
 * - Триггеры props (change:visible → changeVisible EventEmitter)
 * - Явные события (element:ready → elementReady EventEmitter)
 */

import type { EventEmitter } from '@angular/core'
import type { IAccessor, IAccessorProp, TDescriptorInspector } from '@soldy/accessor'

export function bindEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	outputs: Record<string, EventEmitter<any>>,
): () => void {
	const offs: Array<() => void> = []

	// 1. Триггеры props
	for (const prop of accessor.getProps(true) as IAccessorProp[]) {
		const eventSource = accessor.getEventSource(prop)

		if (!eventSource) continue

		const exportTriggers = inspector.getExportTriggers(prop)
		const rawTriggers = inspector.getRawTriggers(prop)

		for (let i = 0; i < rawTriggers.length; i++) {
			const outputName = exportTriggers[i]
			const emitter = outputs[outputName]

			if (!emitter) continue

			const handler = (...args: any[]) => emitter.emit(args[0])

			eventSource.on(rawTriggers[i], handler)
			offs.push(() => eventSource.off(rawTriggers[i], handler))
		}
	}

	// 2. Явные события
	for (const evt of accessor.getEvents()) {
		const eventSource = accessor.getEventSource(evt)

		if (!eventSource) continue

		const outputName = inspector.getExportEventName(evt.name)
		const emitter = outputs[outputName]

		if (!emitter) continue

		const handler = (...args: any[]) => emitter.emit(args[0])

		eventSource.on(evt.name.name, handler)
		offs.push(() => eventSource.off(evt.name.name, handler))
	}

	return () => offs.forEach((off) => off())
}
