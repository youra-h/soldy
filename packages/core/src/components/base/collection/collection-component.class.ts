import { TComponent } from '../component'
import type { IComponentProps, TComponentEvents } from '../component'
import { TCollectionEngine } from './engine.class'
import type { ICollectionStorageDriver } from './types'
import type { IExtension } from './extension'

/**
 * Фасад владельца коллекции.
 *
 * Похож на обычный `TComponent`, но внутри держит `TCollectionEngine` (engine + расширения)
 * и релеит события коллекции в собственный `events`. Благодаря этому дескриптор фасада
 * можно собрать обычным `defineComponent` — без `defineCollection`.
 *
 * Дженерик над `TItem` и набором расширений `TExtensions`, поэтому подходит для любой
 * коллекции (tabs, collapse, list, list-box, tree, ...) с любым набором расширений.
 */
export abstract class TCollectionComponent<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>>,
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TComponent<IComponentProps, TEvents> {
	public readonly collection: TCollectionEngine<TItem, TExtensions>

	constructor(collection: TCollectionEngine<TItem, TExtensions>) {
		super()

		this.collection = collection

		// Системные события движка: item:*, change:items/count, reset.
		this.events.relay(this.collection.engine.events, [
			'item:add:before',
			'item:added',
			'item:removed',
			'item:updated',
			'item:moved',
			'change:items',
			'change:count',
			'reset',
		])
	}

	get engine(): ICollectionStorageDriver<TItem> {
		return this.collection.engine
	}

	get extensions(): TExtensions {
		return this.collection.extensions
	}

	batch(action: () => void): void {
		this.collection.batch(action)
	}
}
