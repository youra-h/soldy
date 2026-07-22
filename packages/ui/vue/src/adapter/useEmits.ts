/**
 * Vue-адаптер: генерирует emits из дескриптора.
 *
 * Использует TDescriptorInspector для статического анализа схемы.
 * Добавляет update:* для v-model (специфика Vue).
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { TDescriptorInspector } from '@soldy/accessor'

export function useEmits(descriptor: IComponentDescriptor): string[] {
    const inspector = new TDescriptorInspector(descriptor)
    const emits = inspector.getExportEvents()

    // Добавляем update:* для v-model (только Vue)
    for (const prop of descriptor.props) {
        if (!prop.protected) {
            emits.push(`update:${inspector.getExportName(prop)}`)
        }
    }

    return Array.from(new Set(emits))
}
