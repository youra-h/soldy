/**
 * Framework-agnostic биндинг плагинов: instance → TInstancePlugin, element → TElementPlugin.
 *
 * Не зависит от фреймворка. Возвращает bindElement — функция для привязки DOM-элемента.
 */

import type { IPluginBundle } from '@soldy/plugins'
import { TInstancePlugin, TElementPlugin } from '@soldy/plugins'

export function bindPlugins(bundle: IPluginBundle, instance: any) {
    const instancePlugin = bundle.get(TInstancePlugin)
    if (instancePlugin) {
        instancePlugin.instance = instance
    }

    const elementPlugin = bundle.get(TElementPlugin)

    return {
        /** Привязать DOM-элемент к TElementPlugin */
        bindElement(el: Element | null) {
            if (elementPlugin) {
                elementPlugin.element = el as HTMLElement | null
            }
        },
    }
}
