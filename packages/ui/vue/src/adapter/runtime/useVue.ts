/**
 * useVue — единственный Vue-хук на весь проект.
 *
 * 1. Навешивает реактивность (SyncProps / SyncEvents)
 * 2. Привязывает DOM-элемент через adapter.bindElement
 * 3. Вызывает adapter.destroy() при анмаунте компонента
 */

import { ref, watch, onUnmounted } from 'vue'
import type { IAdapterContext } from '@soldy/setup'
import { createInspector } from '../common'
import { useSyncProps } from './useSyncProps'
import { useSyncEvents } from './useSyncEvents'

export function useVue(
    adapter: IAdapterContext,
    externalProps: Record<string, any>,
    emit?: (event: string, ...args: any[]) => void,
) {
    const inspector = createInspector(adapter.accessor)

    // 1. Реактивность
    const { refs, bindOutput, bindInput } = useSyncProps(adapter.accessor, inspector)
    bindOutput()
    bindInput(externalProps)

    // 2. Эмиты
    useSyncEvents(adapter.accessor, inspector, emit)

    // 3. DOM-биндинг через метод адаптера (установлен withPluginsBinding)
    const rootElement = ref<Element | null>(null)

    watch(rootElement, (el) => adapter.bindElement?.(el ?? null), { flush: 'post' })

    // 4. Единая точка очистки ресурсов при выходе из Vue-компонента
    onUnmounted(() => {
        adapter.destroy()
    })

    return {
        ctrl: adapter.instance,
        plugins: adapter.bundle,
        rootElement,
        ...refs,
    }
}
