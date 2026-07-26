/**
 * TPluginsBindingExtension — связывает IAdapterContext с плагинами инстанса и DOM.
 *
 * Отвечает ТОЛЬКО за:
 * 1. Привязку instance к TInstancePlugin
 * 2. Метод bindElement для управления TElementPlugin
 * 3. Автоматический сброс DOM-ссылки при adapter.destroy()
 */

import { TInstancePlugin, TElementPlugin } from '@soldy/plugins'
import type { IAdapterContext } from '../context'

export class TPluginsBindingExtension {
    static readonly key = Symbol('TPluginsBindingExtension')

    private _elementPlugin: TElementPlugin | undefined

    constructor(context: IAdapterContext) {
        // 1. Привязываем instance к TInstancePlugin
        const instancePlugin = context.bundle.get(TInstancePlugin)
        if (instancePlugin) {
            instancePlugin.instance = context.instance
        }

        // 2. Находим elementPlugin для последующей привязки DOM
        this._elementPlugin = context.bundle.get(TElementPlugin)

        // 3. Отписка через единую шину событий
        context.events.on('destroy', () => {
            this.bindElement(null)
        })
    }

    /** Привязать DOM-элемент к плагину */
    bindElement(el: Element | null): void {
        if (this._elementPlugin) {
            this._elementPlugin.element = el as HTMLElement | null
        }
    }
}
