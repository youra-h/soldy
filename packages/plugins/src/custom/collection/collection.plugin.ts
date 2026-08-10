import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TCollection } from './engine'
import type { IExtension, TEngineEvents } from './engine'
import { TEvented } from '@soldy/core'
import type { ICollectionPluginOptions } from './types'

export class TCollectionPlugin<T extends object> extends TBasePlugin<any, TEngineEvents<T>> {
	static readonly namespace = Symbol('collection')

	private _collection!: TCollection<T, any>

	override install(ctx: IPluginContext, options?: ICollectionPluginOptions<T>): void {
		super.install(ctx, options)

		// Создаём экземпляры расширений из конструкторов
		const extInstances: Record<string, IExtension<T>> = {}

		for (const [name, Ctor] of Object.entries(options?.extensions ?? {})) {
			extInstances[name] = new Ctor()
		}

		this._collection = new TCollection<T, Record<string, IExtension<T>>>({
			extensions: extInstances,
		})

		// Сквозной проброс всех событий engine (item:added, item:removed, ...)
		this._collection.engine.events.use(({ event, args }) => {
			;(this.events as TEvented<any>).emit(event, ...args)
		})

		// Сквозной проброс всех событий расширений (items:added, change:selection, ...)
		for (const ext of Object.values(this._collection.extensions)) {
			const extEvents = (ext as any).events as TEvented<any> | undefined

			if (extEvents) {
				extEvents.use(({ event, args }) => {
					;(this.events as TEvented<any>).emit(event, ...args)
				})
			}
		}

		if (Array.isArray(options?.items) && options.items.length > 0) {
			;(this._collection.extensions as any).batch?.add?.(options.items)
		}
	}

	get collection(): TCollection<T, any> {
		return this._collection
	}

	get extensions(): Record<string, IExtension<T>> {
		return this._collection.extensions
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
