import type { IExtension, IExtensionItems } from '../extension'
import type { TExtractItemAdapters } from './types'

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
	/**
	 * Динамический объект адаптеров с автовыводом типов.
	 * Адаптеры создаются лениво (при первом обращении) и кешируются.
	 */
	public readonly adapters: TExtractItemAdapters<TExtensions>

	constructor(
		public readonly owner: TItem,
		extensions: TExtensions,
	) {
		const cache = new Map<string, unknown>()

		this.adapters = new Proxy({} as TExtractItemAdapters<TExtensions>, {
			get(_target, prop: string) {
				if (cache.has(prop)) {
					return cache.get(prop)
				}

				const ext = extensions[prop]

				if (
					ext &&
					typeof (ext as unknown as IExtensionItems<TItem>).createItem === 'function'
				) {
					const adapter = (ext as unknown as IExtensionItems<TItem>).createItem(owner)

					cache.set(prop, adapter)

					return adapter
				}

				return undefined
			},
		})
	}
}
