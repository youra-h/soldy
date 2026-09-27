import type { IExtension } from '../extension'
import type {
	ICollectionStorageDriver,
	ICollectionEngineCore,
	TCollectionStorageDriverEvents,
} from '../types'
import { TItemContext } from './item.class'

/**
 * Реестр контекстов элементов — кеширует TItemContext по элементам.
 *
 * Создаётся один раз для коллекции, затем через `.get(item)` получается контекст для любого элемента.
 *
 * Реестр — для кода, которому контексты нужны дольше одного монтирования:
 * расширения `tabs` и `tags` держат свой, чтобы закрывать элементы по их
 * адаптерам. Контекст живёт, пока элемент в коллекции, и уничтожается при
 * удалении: на `item:removed` реестр подписан, пока его не отпустят
 * (`release()`). Владельческое расширение отпускает свой реестр, когда
 * движок переходит к другому владельцу. Монтированию элемента реестр не
 * годится: заведённый на монтирование, он оставил бы на движке и эту
 * подписку, и контекст элемента из данных, который в коллекции остаётся, — с
 * каждым показом новые. У монтирования свой `TItemContext`, и отпускает его
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

	/**
	 * Контексты по элементам. `Map`, а не `WeakMap`: `release()` отпускает
	 * каждый. Запись уходит, когда элемент удалили из коллекции, поэтому
	 * реестр держит только элементы, которые и так держит движок.
	 */
	private readonly _contexts = new Map<TItem, TItemContext<TItem, TExtensions>>()

	private readonly _onRemoved: TCollectionStorageDriverEvents<TItem>['item:removed'] = (e) =>
		this.destroy(e.item)

	constructor(collectionCore: ICollectionEngineCore<TItem, TExtensions>) {
		this._extensions = collectionCore.extensions
		this._driver = collectionCore.driver

		this._driver.events.on('item:removed', this._onRemoved)
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

	/**
	 * Реестр больше не нужен: отписаться от драйвера и отпустить контексты
	 * (`TItemContext.release`). Элементы не трогаются — они остаются в
	 * коллекции, ушёл только тот, кто держал реестр.
	 */
	release(): void {
		this._driver.events.off('item:removed', this._onRemoved)

		for (const context of this._contexts.values()) context.release()

		this._contexts.clear()
	}
}
