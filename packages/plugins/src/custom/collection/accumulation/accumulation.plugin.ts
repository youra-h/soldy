import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TCollectionItemPlugins } from './item.plugin'
import { TCollectionPlugin } from '../collection.plugin'

/**
 * Базовый плагин для накопления (accumulation) значений элементов коллекции.
 *
 * Слушает {@link TCollectionItemPlugins}, извлекает значение указанного типа
 * из бандла каждого item'а и поддерживает упорядоченный {@link items} —
 * порядок соответствует порядку элементов в коллекции.
 *
 * @template TValue — тип накапливаемых значений (HTMLElement | IComponentView)
 * @template TCustomEvents — события конкретной реализации
 */
export abstract class TAccumulationPlugin<
	TValue,
	TCustomEvents extends Record<string, (...args: any) => any> = {},
> extends TBasePlugin<any, TCustomEvents> {
	private readonly _items = new Map<string | number, TValue>()

	/** Упорядоченный реестр накопленных значений. Порядок соответствует коллекции. */
	get items(): ReadonlyMap<string | number, TValue> {
		return this._items
	}

	/**
	 * Подписывается на события готовности/удаления источника.
	 * Вызывается при `item:registered`.
	 */
	protected abstract _track(uid: string | number, ctx: IPluginContext): void

	/** Добавить значение в реестр. */
	protected _add(uid: string | number, value: TValue): void {
		this._items.set(uid, value)
	}

	/** Удалить значение из реестра. */
	protected _remove(uid: string | number): void {
		this._items.delete(uid)
	}

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const collectionPlugin = ctx.get(TCollectionPlugin)

		// Следим за перемещением для поддержания порядка
		if (collectionPlugin) {
			collectionPlugin.events.on('item:moved', () => this._reorder(collectionPlugin))
		}

		const itemPlugins = ctx.get(TCollectionItemPlugins)

		itemPlugins?.events.on('item:registered', ({ uid, ctx }) => {
			this._track(uid, ctx)
		})

		itemPlugins?.events.on('item:unregistered', ({ uid }) => {
			this._remove(uid)
		})
	}

	private _reorder(collectionPlugin: TCollectionPlugin<any>): void {
		const old = new Map(this._items)

		this._items.clear()

		for (const item of collectionPlugin.items) {
			const uid = (item as any).uid

			if (old.has(uid)) {
				this._items.set(uid, old.get(uid)!)
			}
		}
	}

	// --- accessors ---

	getByUid(uid: string | number): TValue | null {
		return this._items.get(uid) ?? null
	}

	getByIndex(index: number): TValue | null {
		return Array.from(this._items.values())[index] ?? null
	}

	getUidByValue(value: TValue): string | number | null {
		for (const [uid, v] of this._items) {
			if (v === value) return uid
		}

		return null
	}

	getAll(): TValue[] {
		return Array.from(this._items.values())
	}
}
