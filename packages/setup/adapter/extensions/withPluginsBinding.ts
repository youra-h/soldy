/**
 * withPluginsBinding — связывает IAdapterContext с плагинами инстанса и DOM.
 *
 * Отвечает ТОЛЬКО за:
 * 1. Привязку instance к TInstancePlugin
 * 2. Добавление метода bindElement в контекст для управления TElementPlugin
 * 3. Автоматический сброс DOM-ссылки при adapter.destroy()
 *
 * Включается в контекст по умолчанию — компонентам не нужно думать о биндинге плагинов.
 */

import { TInstancePlugin, TElementPlugin } from '@soldy/plugins'
import type { IAdapterContext } from '../context'

export function withPluginsBinding(adapter: IAdapterContext): void {
    const { bundle, instance } = adapter

    // 1. Привязываем instance к TInstancePlugin при инициализации
    const instancePlugin = bundle.get(TInstancePlugin)
    if (instancePlugin) {
        instancePlugin.instance = instance
    }

    // 2. Обучаем контекст методу bindElement для управления DOM
    const elementPlugin = bundle.get(TElementPlugin)

    adapter.bindElement = (el: Element | null) => {
        if (elementPlugin) {
            elementPlugin.element = el as HTMLElement | null
        }
    }

    // 3. Регистрируем сброс элемента при destroy()
    adapter.onDispose(() => {
        adapter.bindElement?.(null)
    })
}
