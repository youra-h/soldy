// common/tabs/collection.plugin.ts

import { TCollectionPlugin } from '../collection/collection.plugin'
import type { IPluginBundle } from '../../base/types'
import { TInstancePlugin } from '../instance'
import { TPlainExtension, TBatchExtension, TSelectionExtension } from '@soldy/core'
import type { ITabItem } from '@soldy/core'

/**
 * TTabsCollectionPlugin — tabs-специфичный плагин коллекции.
 * Создаёт TCollection с plain/batch/selection расширениями,
 * настраивает per-item связи (closable, события) и пропагацию size/variant/disabled.
 */
export class TTabsCollectionPlugin extends TCollectionPlugin<ITabItem> {
    static override readonly key = Symbol('tabs-collection')

    constructor() {
        super({
            extensions: {
                plain: new TPlainExtension<ITabItem>(),
                batch: new TBatchExtension<ITabItem>(),
                selection: new TSelectionExtension<ITabItem>(),
            },
        })
    }

    override install(bundle: IPluginBundle): void {
        super.install(bundle)

        const instancePlugin = bundle.get(TInstancePlugin)

        instancePlugin?.events.on('ready', ({ instance }) => {
            const tabs = instance as any
            const collection = tabs._collection

            if (!collection) return

            // Per-item setup
            collection.engine.events.on('item:added', (item: ITabItem) => {
                item.events.on('close', () => tabs.closeTab?.(item))
                item.setClosableResolver(() => tabs._closable)

                item.events.on('change:closable', (value: boolean | undefined) => {
                    tabs.events.emit('item:closable', item, !!value)
                })

                item.events.on('change:disabled', (value: boolean) => {
                    tabs.events.emit('item:disabled', item, value)
                })

                item.events.on('change:text', (payload: any) => {
                    tabs.events.emit('item:text', item, payload.newValue)
                })

                item.events.on('change:rendered', (value: boolean) => {
                    tabs.events.emit('item:rendered', item, value)
                })

                item.events.on('change:visible', (value: boolean) => {
                    tabs.events.emit('item:visible', item, value)
                })

                item.events.on('change:present', (value: boolean) => {
                    tabs.events.emit('item:present', item, value)
                })

                item.disabled = tabs.disabled
                item.size = tabs.size
                item.variant = tabs.variant
            })

            // Propagation: size, variant, disabled → все item'ы
            tabs.events.on('change:size', (payload: any) => {
                collection.engine.forEach((item: ITabItem) => {
                    item.size = payload.newValue
                })
            })

            tabs.events.on('change:variant', (payload: any) => {
                collection.engine.forEach((item: ITabItem) => {
                    item.variant = payload.newValue
                })
            })

            tabs.events.on('change:disabled', (value: boolean) => {
                collection.engine.forEach((item: ITabItem) => {
                    item.disabled = value
                })
            })
        })
    }
}
