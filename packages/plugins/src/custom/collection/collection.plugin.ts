import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TCollection } from './engine'
import type { IExtension, TEngineEvents } from './engine'
import { TEvented } from '@soldy/core'

export interface ICollectionPluginOptions<T> {
	extensions?: Record<string, IExtension<T>>
	items?: T[]
}

/**
 * TCollectionPlugin — плагин коллекции.
 * Владеет TCollection, relay'ит события на свои events.
 */
export class TCollectionPlugin<T> extends TBasePlugin<any, TEngineEvents<T>> {
	static readonly namespace = Symbol('collection')

	get namespace(): symbol {
		return TCollectionPlugin.namespace
	}

	private _collection!: TCollection<T, any>
	private _options: ICollectionPluginOptions<T>

	constructor(options: ICollectionPluginOptions<T> = {}) {
		super()
		this._options = options
	}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._collection = new TCollection<T, Record<string, IExtension<T>>>({
			extensions: this._options.extensions ?? ({} as Record<string, IExtension<T>>),
		})

		// Relay движка → плагин
		this._collection.engine.events.relay(this.events, [
			'item:added',
			'item:removed',
			'item:updated',
			'item:moved',
			'change:items',
			'change:count',
			'reset',
		])

		// Relay расширений → плагин
		for (const ext of Object.values(this._collection.extensions)) {
			const extEvents = (ext as any).events as TEvented<any> | undefined
			if (extEvents?.relay) {
				const eventKeys = Object.keys(extEvents as any) as string[]
				;(this.events as TEvented<any>).relay(extEvents, eventKeys)
			}
		}

		if (Array.isArray(this._options.items) && this._options.items.length > 0) {
			;(this._collection.extensions as any).batch?.add?.(this._options.items)
		}
	}

	get items(): readonly T[] {
		return this._collection.engine
	}

	get length(): number {
		return this._collection.engine.length
	}

	insert(item: T, index?: number): void {
		;(this._collection.extensions as any).plain?.insert?.(item, index ?? 0)
	}

	remove(item: T): void {
		;(this._collection.extensions as any).plain?.remove?.(item)
	}
}
