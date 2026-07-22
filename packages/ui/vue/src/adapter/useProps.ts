/**
 * Vue-адаптер: генерирует props из дескриптора.
 *
 * Использует DescriptorInspector для статического анализа схемы.
 * Системные пропы (ctrl, plugins) добавляются здесь — accessor о них не знает.
 */

import type { IComponentDescriptor } from '@soldy/setup'
import { DescriptorInspector } from '@soldy/accessor'

export function useProps(descriptor: IComponentDescriptor): Record<string, any> {
    const defaults = (descriptor.ctor as any)?.defaultValues ?? {}
    const inspector = new DescriptorInspector(descriptor)

    return {
        // 1. Все пропы из доменной модели компонентов и плагинов
        ...inspector.getExportProps(defaults),

        // 2. Системные служебные пропы, специфичные для Vue-адаптера
        ctrl: { type: Object, default: undefined },
        plugins: { type: Object, default: undefined },
    }
}
