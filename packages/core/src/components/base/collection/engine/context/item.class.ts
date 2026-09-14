import type { IExtension, IExtensionItems, IItemExtension } from '../extension'
import type { TExtractItemAdapters } from './types'

/** Умеет ли расширение создавать item-адаптеры (`IExtensionItems`). */
function hasItems<TItem extends object>(
	ext: IExtension<TItem>,
): ext is IExtension<TItem> & IExtensionItems<TItem> {
	return 'createItem' in ext && typeof ext.createItem === 'function'
}

/**
 * Контекст элемента коллекции — динамический доступ к адаптерам расширений через Proxy.
 *
 * При обращении к `itemCtx.adapters.activation` Proxy находит расширение по ключу,
 * вызывает `createItem(owner)` и кеширует результат. Имена адаптеров выводятся из типа `TExtensions`.
 *
 * @template TItem       — тип элемента коллекции
 * @template TExtensions — тип объекта расширений коллекции
 */
export class TItemContext<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>> = Record<string, any>,
> {
	private readonly _cache = new Map<string, IItemExtension<TItem>>()
	/**
	 * Динамический объект адаптеров с автовыводом типов.
	 * Адаптеры создаются лениво (при первом обращении) и кешируются.
	 */
	public readonly adapters: TExtractItemAdapters<TExtensions>

	constructor(
		public readonly owner: TItem,
		extensions: TExtensions,
	) {
		this.adapters = new Proxy({} as TExtractItemAdapters<TExtensions>, {
			get: (_target, prop: string) => {
				if (this._cache.has(prop)) {
					return this._cache.get(prop)
				}

				const ext = extensions[prop]

				if (ext && hasItems(ext)) {
					const adapter = ext.createItem(owner)

					this._cache.set(prop, adapter)

					return adapter
				}

				return undefined
			},
		})
	}

	/**
	 * Очистить кеш адаптеров и вызвать `destroy()` у каждого.
	 * Вызывается при удалении элемента из коллекции. В item идет отписка от событий расширений, middleware, входящие подписки.
	 * После вызова `destroy()` контекст элемента больше не должен использоваться.
	 * (Вызов `destroy()` у адаптеров не вызывает удаление их из кеша — это делает сам контекст.)
	 * @internal
	 */
	destroy(): void {
		for (const adapter of this._cache.values()) {
			adapter.destroy()
		}

		this._cache.clear()

		// Если у элемента есть свойство `rendered`, то при удалении элемента из коллекции оно сбрасывается в `false`.
		if ('rendered' in this.owner) {
			;(this.owner as { rendered: boolean }).rendered = false
		}
	}
}
