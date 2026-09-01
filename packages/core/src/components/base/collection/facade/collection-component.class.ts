import { TComponent } from '../../component'
import type { IComponentProps, TComponentEvents } from '../../component'
import { TCollectionEngine } from './../engine'
import type { ICollectionStorageDriver, IExtension } from './../engine'
import type { ICollectionComponentOptions } from './types'

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
	public readonly engine: TCollectionEngine<TItem, TExtensions>

	constructor(
		props: Partial<IComponentProps> = {},
		options: ICollectionComponentOptions<TItem, TExtensions>,
	) {
		super(props, options)

		this.engine = options.engine

		// Системные события движка: item:*, change:items/count, reset.
		this.events.relay(this.engine.driver.events, [
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

	get driver(): ICollectionStorageDriver<TItem> {
		return this.engine.driver
	}

	get extensions(): TExtensions {
		return this.engine.extensions
	}

	batch(action: () => void): void {
		this.engine.batch(action)
	}
}
