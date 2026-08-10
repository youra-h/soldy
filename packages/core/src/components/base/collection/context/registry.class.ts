import type { IExtension } from '../extension'
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
	private _contexts = new WeakMap<TItem, TItemContext<TItem, TExtensions>>()

	constructor(private readonly _extensions: TExtensions) {}

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
}
