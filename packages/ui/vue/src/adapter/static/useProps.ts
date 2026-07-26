/**
 * Статический хелпер для сборки props во Vue Options API (base.component.ts).
 *
 * Выполняется на этапе объявления компонента (Build Time),
 * не имеет сайд-эффектов и не тянет реактивный runtime.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { getInspector } from '../helpers'

export function useProps(descriptor: IComponentDescriptor): Record<string, any> {
    const defaults = (descriptor.ctor as any)?.defaultValues ?? {}

    return getInspector(descriptor).getExportProps(defaults)
}
