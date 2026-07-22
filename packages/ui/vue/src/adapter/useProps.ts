/**
 * Vue-адаптер: генерирует props из ComponentAccessor.
 *
 * Для каждого публичного свойства создаёт Vue prop.
 */

import type { ComponentAccessor } from '@soldy/provider'

export function useProps(accessor: ComponentAccessor, defaultValues: Record<string, any> = {}): Record<string, any> {
    const props: Record<string, any> = {}

    // Берем только публичные пропы
    for (const prop of accessor.getProps(false)) {
        const exportName = accessor.getExportName(prop)

        props[exportName] = {
            default: defaultValues[prop.name],
        }
    }

    // Системные пропы для передачи контроллера или плагинов напрямую
    props.ctrl = { type: Object, default: undefined }
    props.plugins = { type: Object, default: undefined }

    return props
}
