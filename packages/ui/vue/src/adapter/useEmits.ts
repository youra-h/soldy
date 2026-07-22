/**
 * Vue-адаптер: генерирует emits из ComponentAccessor.
 *
 * - Явные события (через getExportName)
 * - Триггеры свойств (через getTriggers)
 * - update:* для v-model (только публичные свойства)
 */

import type { ComponentAccessor } from '@soldy/provider'

export function useEmits(accessor: ComponentAccessor): string[] {
    const emits: string[] = []

    // 1. Все явные события ('ready', 'element:ready' и т.д.)
    for (const evt of accessor.getEvents()) {
        emits.push(accessor.getExportName(evt))
    }

    // 2. Все триггеры и v-model события свойств
    for (const prop of accessor.getProps(true)) {
        // Добавляем готовые триггеры свойства
        emits.push(...accessor.getTriggers(prop))

        // Добавляем update:* для публичных свойств (v-model)
        if (!prop.protected) {
            emits.push(`update:${accessor.getExportName(prop)}`)
        }
    }

    return Array.from(new Set(emits))
}
