import type { IExtension } from '../extension'
import type { ICollectionStorageDriver, ICollectionEngineCore } from '../types'
import { TItemContext } from './item.class'

/**
 * Реестр контекстов элементов — кеширует TItemContext по элементам через WeakMap.
 *
 * Создаётся один раз для коллекции, затем через `.get(item)` получается контекст для любого элемента.
 *
 * Реестр — для кода, которому контексты нужны на всю жизнь движка: расширения
 * `tabs` и `tags` держат свой, чтобы закрывать элементы по их адаптерам.
 * Контекст живёт, пока элемент в коллекции, и уничтожается при удалении, а на
 * `item:removed` реестр подписан навсегда. Монтированию элемента реестр не
 * годится: заведённый на монтирование, он оставил бы на движке и эту подписку,
 * и контекст элемента из данных, который в коллекции остаётся, — с каждым
 * показом новые. У монтирования свой `TItemContext`, и отпускает его
 * `release()`.
 *
 * @template TItem       — тип элемента коллекции
 * @template TExtensions — тип объекта расширений коллекции
 *
 * @example
 * ```ts
 * const registry = new TItemContextRegistry(engine.getCore())
 * const ctx = registry.get(someItem)
 * ctx.adapters.activation.active = true
 * ```
 */
export class TItemContextRegistry<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>> = Record<string, any>,
> {
	private readonly _extensions: TExtensions
	private readonly _driver: ICollectionStorageDriver<TItem>

	private _contexts = new WeakMap<TItem, TItemContext<TItem, TExtensions>>()

	constructor(collectionCore: ICollectionEngineCore<TItem, TExtensions>) {
		this._extensions = collectionCore.extensions
		this._driver = collectionCore.driver

		this._driver.events.on('item:removed', (e) => this.destroy(e.item))
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
	 * Вызывается при удалении элемента из коллекции: адаптеры отписываются от
	 * расширений, элемент получает `rendered = false` (см. `TItemContext.destroy`).
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
