import { TComponent } from '../component'
import type { IComponentProps, TComponentEvents } from '../component'
import { TCollection } from './collection.class'
import type { ICollectionEngine } from './types'
import type { IExtension } from './extension'

/**
 * Фасад владельца коллекции.
 *
 * Похож на обычный `TComponent`, но внутри держит `TCollection` (engine + расширения)
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
	public readonly collection: TCollection<TItem, TExtensions>

	constructor(collection: TCollection<TItem, TExtensions>) {
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

	get engine(): ICollectionEngine<TItem> {
		return this.collection.engine
	}

	get extensions(): TExtensions {
		return this.collection.extensions
	}

	batch(action: () => void): void {
		this.collection.batch(action)
	}
}
