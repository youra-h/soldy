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
 * Адаптер подписан на своё расширение пробросом, а проброс висит на нём, пока
 * адаптер слушают (см. `TEvented.relay`): подписки держит тот, кто слушает. У
 * контекста же срок жизни свой, и кончается он двумя разными способами.
 * Кончилось то, что держало контекст, — `release()`: адаптеры сняты, кто бы их
 * ни слушал, элемент не тронут. Так монтирование элемента отпускает свой
 * контекст, а элемент из данных после этого остаётся в коллекции и рисуется
 * при следующем показе. Элемент удалён из коллекции — `destroy()`: то же и
 * `rendered = false`.
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
	 * Освободить адаптеры: `destroy()` у каждого и очистка кеша.
	 *
	 * Адаптер отключает и забывает пробросы от расширений и снимает входящие
	 * подписки — в том числе проброс в фасад элемента. Отпущенный адаптер не
	 * подключится к расширениям, даже если его снова начнут слушать. Элемент не
	 * трогается: его судьба не зависит от того, кто держал контекст.
	 *
	 * После `release()` контекст рабочий: обращение к `adapters` создаст адаптер
	 * заново, и снимать его — снова `release()`.
	 * (Вызов `destroy()` у адаптеров не вызывает удаление их из кеша — это делает сам контекст.)
	 */
	release(): void {
		for (const adapter of this._cache.values()) {
			adapter.destroy()
		}

		this._cache.clear()
	}

	/**
	 * Элемент удалён из коллекции: адаптеры освобождаются (`release()`), а
	 * элемент перестаёт рисоваться — `rendered = false`, если оно у него есть.
	 *
	 * Размонтирование элемента сюда не относится: элемент из данных после него
	 * остаётся в коллекции и при следующем показе обязан нарисоваться.
	 */
	destroy(): void {
		this.release()

		// Если у элемента есть свойство `rendered`, то при удалении элемента из коллекции оно сбрасывается в `false`.
		if ('rendered' in this.owner) {
			;(this.owner as { rendered: boolean }).rendered = false
		}
	}
}
