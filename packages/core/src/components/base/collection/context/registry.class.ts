import type { IExtension } from '../extension'
import type { ICollectionEngine, ICollectionCore } from '../types'
import { TItemContext } from './item.class'

/**
 * Реестр контекстов элементов — кеширует TItemContext по элементам через WeakMap.
 *
 * Создаётся один раз для коллекции, затем через `.get(item)` получается контекст для любого элемента.
 *
 * @template TItem       — тип элемента коллекции
 * @template TExtensions — тип объекта расширений коллекции
 *
 * @example
 * ```ts
 * const registry = new TItemContextRegistry(collection.extensions)
 * const ctx = registry.get(someItem)
 * ctx.adapters.activation.active = true
 * ```
 */
export class TItemContextRegistry<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>> = Record<string, any>,
> {
	private readonly _extensions: TExtensions
	private readonly _engine: ICollectionEngine<TItem>

	private _contexts = new WeakMap<TItem, TItemContext<TItem, TExtensions>>()

	constructor(collectionCore: ICollectionCore<TItem, TExtensions>) {
		this._extensions = collectionCore.extensions
		this._engine = collectionCore.engine

		this._engine.events.on('item:removed', (item) => this.destroy(item))
	}

	/**
	 * Получить (или создать и закешировать) контекст для элемента.
	 */
	get(item: TItem): TItemContext<TItem, TExtensions> {
		let context = this._contexts.get(item)

		if (!context) {
			context = new TItemContext(item, this._extensions)
			this._contexts.set(item, context)
		}

		return context
	}

	/**
	 * Очистить кеш контекста элемента и вызвать `destroy()` у него.
	 * Вызывается при удалении элемента из коллекции. В item идет отписка от событий расширений, middleware, входящие подписки.
	 * После вызова `destroy()` контекст элемента больше не должен использоваться.
	 * (Вызов `destroy()` у адаптеров не вызывает удаление их из кеша — это делает сам контекст.)
	 * @internal
	 * @param item — элемент коллекции, для которого нужно очистить контекст
	 */
	destroy(item: TItem): void {
		const context = this._contexts.get(item)

		if (context) {
			context.destroy()
			this._contexts.delete(item)
		}
	}
}
