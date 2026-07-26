/**
 * Статический хелпер для сборки emits во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { createInspector } from '../common'

export function useEmits(descriptor: IComponentDescriptor): string[] {
    const inspector = createInspector(descriptor)
    const emits = inspector.getExportEvents()

    for (const prop of descriptor.props) {
        if (!prop.protected && prop.triggers.length > 0) {
            emits.push(`update:${inspector.getExportPropName(prop)}`)
        }
    }

    return Array.from(new Set(emits))
}
