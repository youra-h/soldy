import { TBasePlugin } from '../../base'
import type { IPluginBundle } from '../../base'
import type { TCollection } from '@soldy/core'

/** События реестра bundles элементов коллекции. */
export type TBundlesEvents = {
	'bundle:registered': (payload: {
		uid: string | number
		bundle: IPluginBundle
	}) => void
	'bundle:unregistered': (payload: { uid: string | number }) => void
}

/**
 * TCollectionBundlesPlugin — реестр plugin-bundles элементов коллекции.
 *
 * Держит ссылку на коллекцию (`collection`), поэтому любой плагин имеет доступ
 * ко всему состоянию коллекции (активный элемент, порядок, элементы) без костылей
 * для каждого отдельного свойства.
 *
 * Накапливает ТОЛЬКО bundles: Map<uid, IPluginBundle>. Реестр синхронизируется с
 * жизненным циклом элементов коллекции через события engine (`item:removed`, `reset`).
 * Порядок bundles всегда берётся из коллекции, поэтому `item:moved` не требует
 * дополнительной обработки.
 *
 * Устанавливается на owner-компоненте коллекции (например, Tabs). Коллекция
 * привязывается через {@link bindCollection} из adapter-слоя после её создания.
 */
export class TCollectionBundlesPlugin extends TBasePlugin<any, TBundlesEvents> {
	private _collection: TCollection<any, any> | null = null
	private readonly _bundles = new Map<string | number, IPluginBundle>()

	/** Привязать коллекцию. Вызывается adapter-слоем после создания коллекции. */
	bindCollection(collection: TCollection<any, any>): void {
		if (this._collection === collection) return

		this._collection = collection

		// Синхронизация реестра bundles с жизненным циклом элементов коллекции.
		collection.engine.events.on('item:removed', (item) => {
			const uid = this._uid(item)

			if (uid !== undefined) {
				this._bundles.delete(uid)
			}
		})

		collection.engine.events.on('reset', () => {
			this._bundles.clear()
		})
	}

	/** Ссылка на коллекцию, к которой привязан реестр. */
	get collection(): TCollection<any, any> | null {
		return this._collection
	}

	/** Зарегистрировать bundle элемента коллекции (ключ — uid элемента). */
	register(bundle: IPluginBundle, item: unknown): void {
		const uid = this._uid(item)

		if (uid === undefined) return

		this._bundles.set(uid, bundle)

		this.events.emit('bundle:registered', { uid, bundle })
	}

	/** Снять регистрацию bundle элемента коллекции. */
	unregister(uid: string | number): void {
		this._bundles.delete(uid)

		this.events.emit('bundle:unregistered', { uid })
	}

	/** Bundle элемента по uid. */
	getByUid(uid: string | number): IPluginBundle | undefined {
		return this._bundles.get(uid)
	}

	/** Bundle по элементу коллекции. */
	getByItem(item: unknown): IPluginBundle | undefined {
		const uid = this._uid(item)

		return uid === undefined ? undefined : this._bundles.get(uid)
	}

	/** Все bundles в порядке элементов коллекции. */
	getAll(): IPluginBundle[] {
		if (!this._collection) return Array.from(this._bundles.values())

		const result: IPluginBundle[] = []

		for (const item of this._collection.engine) {
			const bundle = this.getByItem(item)

			if (bundle) result.push(bundle)
		}

		return result
	}

	private _uid(item: unknown): string | number | undefined {
		return (item as { uid?: string | number } | null | undefined)?.uid
	}
}
