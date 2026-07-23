import type { TComponentAccessor, TDescriptorInspector, ICompiledProp } from '@soldy/accessor'

/**
 * Проброс событий из Core наружу через emit.
 *
 * - Триггеры свойств (change:visible → element:change:visible)
 * - Явные события (ready → element:ready)
 */
export function useSyncEvents(
    accessor: TComponentAccessor,
    inspector: TDescriptorInspector,
    emit?: (event: string, ...args: any[]) => void,
) {
    if (!emit) return

    // 1. Подписка на триггеры свойств
    for (const prop of accessor.getProps(true) as ICompiledProp[]) {
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
        const eventName = inspector.getExportEventName(evt)
        const eventSource = accessor.getEventSource(evt)

        if (eventSource) {
            eventSource.on(evt.name, (...args: any[]) => {
                emit(eventName, ...args)
            })
        }
    }
}
