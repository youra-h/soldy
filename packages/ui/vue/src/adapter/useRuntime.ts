/**
 * Vue-адаптер для ComponentAccessor.
 *
 * Создаёт реактивные Vue-refs из accessor'а и подписывается на изменения.
 * Синхронизирует внешние props → accessor.
 * Пробрасывает события и триггеры в emit.
 */

import { watch, onUnmounted, type Ref } from 'vue'
import type { ComponentAccessor } from '@soldy/accessor'
import { useRefs } from './useRefs'

export function useRuntime(
    accessor: ComponentAccessor,
    externalProps: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const refs: Record<string, Ref<any>> = {}

    // 1. Создаем реактивные refs и пробрасываем события их триггеров в emit
    for (const prop of accessor.getProps(true)) {
        const exportName = accessor.getExportName(prop)
        const eventSource = accessor.getEventSource(prop)
        const triggers = accessor.getTriggers(prop)

        refs[exportName] = useRefs(
            eventSource,
            () => accessor.getValue(prop),
            triggers,
        )

        // Пробрасываем триггеры в emit при срабатывании
        if (eventSource && emit) {
            for (const trigger of prop.triggers) {
                // Извлекаем чистое имя события без namespace для подписки на eventSource
                const rawEventName = prop.namespace
                    ? trigger.replace(`${prop.namespace}:`, '')
                    : trigger

                eventSource.on(rawEventName, (val: any) => {
                    emit(trigger, val)
                })
            }
        }
    }

    // 2. Пробрасываем явные события компонентов и плагинов
    for (const evt of accessor.getEvents()) {
        const exportName = accessor.getExportName(evt)
        const eventSource = accessor.getEventSource(evt)

        if (eventSource && emit) {
            eventSource.on(evt.name, (...args: any[]) => {
                emit(exportName, ...args)
            })
        }
    }

    // 3. Синхронизируем Vue Props → Accessor
    const stopWatches: (() => void)[] = []

    for (const prop of accessor.getProps(false)) {
        const exportName = accessor.getExportName(prop)

        stopWatches.push(
            watch(
                () => externalProps[exportName] ?? externalProps[prop.name],
                (newVal) => {
                    if (newVal !== undefined) {
                        accessor.setValue(prop, newVal)
                    }
                },
            ),
        )
    }

    // 4. Cleanup
    onUnmounted(() => {
        stopWatches.forEach((fn) => fn())
    })

    return { refs }
}
