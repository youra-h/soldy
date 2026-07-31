// common/collection/collection.plugin.ts

import { TBasePlugin } from '../../base'
import type { IPluginBundle } from '../../base/types'
import type { IExtension } from '@soldy/core'
import { TCollection } from '@soldy/core'
import { TInstancePlugin } from '../instance'
import { TEvented } from '@soldy/core'

export type TCollectionPluginEvents<T> = {
    'collection:ready': (collection: TCollection<T, any>) => void
}

export interface ICollectionPluginOptions<T> {
    /** Расширения для TCollection */
    extensions?: Record<string, IExtension<T>>

    /** Начальные элементы */
    items?: T[]

    /**
     * Вызывается при добавлении каждого элемента.
     * Позволяет компоненту настроить per-item связи (события, пропсы).
     */
    onItemAdded?: (item: T, collection: TCollection<T, any>, instance: any) => void

    /**
     * Вызывается при изменении свойства экземпляра, которое нужно
     * пробросить на все элементы (size, variant, disabled).
     */
    onPropagate?: (event: string, value: any, collection: TCollection<T, any>) => void
}

/**
 * TCollectionPlugin — плагин, создающий и управляющий TCollection.
 *
 * Устанавливает instance._collection, relay'ит события коллекции на instance.events,
 * и через колбэки позволяет компоненту настроить per-item связи и пропагацию.
 */
export class TCollectionPlugin<T> extends TBasePlugin<TCollectionPluginEvents<T>> {
    static readonly key = Symbol('collection')

    private _options: ICollectionPluginOptions<T>

    constructor(options: ICollectionPluginOptions<T> = {}) {
        super()
        this._options = options
    }

    override install(bundle: IPluginBundle): void {
        const instancePlugin = bundle.get(TInstancePlugin)

        instancePlugin?.events.on('ready', ({ instance }) => {
            const collection = new TCollection<T, Record<string, IExtension<T>>>({
                extensions: this._options.extensions ?? ({} as Record<string, IExtension<T>>),
            })

            ;(instance as any)._collection = collection

            const instEvents = (instance as any).events as TEvented<any>

            // Relay движка → instance
            if (instEvents?.relay) {
                instEvents.relay(collection.engine.events, [
                    'item:added',
                    'item:removed',
                    'item:updated',
                    'item:moved',
                    'change:items',
                    'change:count',
                    'reset',
                ])
            }

            // Relay расширений → instance
            for (const ext of Object.values(collection.extensions)) {
                const extEvents = (ext as any).events as TEvented<any> | undefined
                if (extEvents?.relay && instEvents?.relay) {
                    const eventKeys = Object.keys(extEvents as any) as string[]
                    instEvents.relay(extEvents, eventKeys)
                }
            }

            // Per-item setup
            if (this._options.onItemAdded) {
                collection.engine.events.on('item:added', (item: T) => {
                    this._options.onItemAdded!(item, collection, instance)
                })
            }

            // Propagation
            if (this._options.onPropagate) {
                const propagateEvents = ['change:size', 'change:variant', 'change:disabled']
                for (const evt of propagateEvents) {
                    instEvents.on(evt, (value: any) => {
                        this._options.onPropagate!(evt, value, collection)
                    })
                }
            }

            // Начальные элементы
            if (this._options.items && this._options.items.length > 0) {
                const batchExt = collection.extensions.batch as any
                batchExt?.add?.(this._options.items)
            }

            ;(this.events as TEvented<TCollectionPluginEvents<T>>).emit('collection:ready', collection)
        })

        instancePlugin?.events.on('removed', () => {
            // TODO: очистка коллекции при destroy
        })
    }
}

