/**
 * useVue — единственный Vue-хук на весь проект.
 *
 * 1. Навешивает реактивность (SyncProps / SyncEvents)
 * 2. Привязывает DOM-элемент через TPluginsBindingExtension
 * 3. Вызывает adapter.destroy() при анмаунте компонента
 */

import { ref, watch, onUnmounted } from 'vue'
import { type IAdapterContext, TPluginsBindingExtension } from '@soldy/setup'
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
	// 1.1. Привязка к внешним пропсам (выход в родительский компонент)
    bindOutput()
	// 1.2. Привязка к внешним пропсам (вход от пользователя)
    bindInput(externalProps)

    // 2. Эмиты
    useSyncEvents(adapter.accessor, inspector, emit)

    // 3. DOM-биндинг через экстеншн плагинов
    const pluginsExt = adapter.get(TPluginsBindingExtension)
    const rootElement = ref<Element | null>(null)

    watch(
        rootElement,
        (el) => pluginsExt?.bindElement(el ?? null),
        { flush: 'post' }
    )

    // 4. Очистка (destroy эмитит 'destroy', все экстеншны отписываются сами)
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
