// services/custom/collection/collection.service.ts

import { TBaseService } from '../../base'
import type { IServiceContext } from '../../base'
import { TCollection, TEvented } from '@soldy/core'
import type { IExtension } from '@soldy/core'

export interface ICollectionServiceOptions<T> {
    extensions?: Record<string, IExtension<T>>
    items?: T[]
}

/**
 * TCollectionService — сервис коллекции.
 * Создаёт TCollection, relay'ит события на instance.
 */
export class TCollectionService<T> extends TBaseService {
    readonly name = 'collection'

    private _options: ICollectionServiceOptions<T>

    constructor(options: ICollectionServiceOptions<T> = {}) {
        super()
        this._options = options
    }

    install(ctx: IServiceContext): void {
        const { instance } = ctx

        const collection = new TCollection<T, Record<string, IExtension<T>>>({
            extensions: this._options.extensions ?? ({} as Record<string, IExtension<T>>),
        })

        ;(instance as any)._collection = collection

        const instEvents = (instance as any).events as TEvented<any>
        if (instEvents?.relay) {
            instEvents.relay(collection.engine.events, [
                'item:added', 'item:removed', 'item:updated',
                'item:moved', 'change:items', 'change:count', 'reset',
            ])
        }

        for (const ext of Object.values(collection.extensions)) {
            const extEvents = (ext as any).events as TEvented<any> | undefined
            if (extEvents?.relay && instEvents?.relay) {
                instEvents.relay(extEvents, Object.keys(extEvents as any) as string[])
            }
        }

        if (Array.isArray(this._options.items) && this._options.items.length > 0) {
            (collection.extensions as any).batch?.add?.(this._options.items)
        }
    }
}
