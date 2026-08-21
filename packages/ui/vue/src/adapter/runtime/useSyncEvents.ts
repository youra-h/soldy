import type { IAccessor, TDescriptorInspector, IAccessorProp } from '@soldy/accessor'

/**
 * Проброс событий из Core наружу через emit.
 *
 * - Триггеры свойств (change:visible → element:change:visible)
 * - Явные события (ready → element:ready)
 */
export function useSyncEvents(
	accessor: IAccessor,
	inspector: TDescriptorInspector,
	emit?: (event: string, ...args: any[]) => void,
) {
	if (!emit) return

	// 1. Подписка на триггеры свойств
	for (const prop of accessor.getProps(true) as IAccessorProp[]) {
		const eventSource = accessor.getEventSource(prop)
		if (!eventSource) continue

		const exportTriggers = inspector.getExportTriggers(prop)
		const rawTriggers = inspector.getRawTriggers(prop)

		for (let i = 0; i < rawTriggers.length; i++) {
			eventSource.on(rawTriggers[i], (val: any) => {
				emit(exportTriggers[i], val)
			})
		}
	}

	// 2. Подписка на явные события
	for (const evt of accessor.getEvents()) {
		const eventName = inspector.getExportEventName(evt.name)
		const eventSource = accessor.getEventSource(evt)

		if (eventSource) {
			eventSource.on(evt.name.name, (...args: any[]) => {
				emit(eventName, ...args)
			})
		}
	}
}
