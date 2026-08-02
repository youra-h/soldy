// services/custom/collection/collection.service.ts

import { TBaseService } from '../../base'
import type { IServiceContext } from '../../base'
import { TCollection } from './engine'
import type { IExtension } from './engine'
import { TEvented } from '@soldy/core'

export interface ICollectionServiceOptions<TInstance> {
	extensions?: Record<string, IExtension<TInstance>>
	items?: TInstance[]
}

/**
 * TCollectionService — сервис коллекции.
 * Создаёт TCollection, relay'ит события на instance.
 */
export class TCollectionService<TInstance> extends TBaseService<TInstance> {
	readonly namespace = Symbol('collection')

	private _options: ICollectionServiceOptions<TInstance>

	constructor(options: ICollectionServiceOptions<TInstance> = {}) {
		super()
		this._options = options
	}

	install(ctx: IServiceContext<TInstance>): void {
		const { instance } = ctx

		const collection = new TCollection<TInstance, Record<string, IExtension<TInstance>>>({
			extensions: this._options.extensions ?? ({} as Record<string, IExtension<TInstance>>),
		})

		;(instance as any)._collection = collection

		const instEvents = (instance as any).events as TEvented<any>
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

		for (const ext of Object.values(collection.extensions)) {
			const extEvents = (ext as any).events as TEvented<any> | undefined
			if (extEvents?.relay && instEvents?.relay) {
				instEvents.relay(extEvents, Object.keys(extEvents as any) as string[])
			}
		}

		if (Array.isArray(this._options.items) && this._options.items.length > 0) {
			;(collection.extensions as any).batch?.add?.(this._options.items)
		}

		super.install(ctx)
	}
}
