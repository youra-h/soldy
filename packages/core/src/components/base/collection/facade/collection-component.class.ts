import { TComponent } from '../../component'
import type { IComponentProps } from '../../component'
import { TCollectionEngine } from './../engine'
import type { IExtension, TPlainExtension } from './../engine'
import type { ICollectionComponentOptions, TCollectionComponentEvents } from './types'

/**
 * Фасад владельца коллекции.
 *
 * Похож на обычный `TComponent`, но внутри держит `TCollectionEngine` (engine + расширения)
 * и релеит события коллекции в собственный `events`. Благодаря этому дескриптор фасада
 * можно собрать обычным `defineComponent` — без `defineCollection`.
 *
 * Дженерик над `TItem` и набором расширений `TExtensions`, поэтому подходит для любой
 * коллекции (tabs, accordion, list, list-box, tree, ...) с любым набором расширений.
 *
 * Набор сужен до `{ plain }`: системные события фасад берёт из `plain`, а его
 * ставит `baseExtensions()` любой коллекции. Без сужения широкий
 * `Record<string, IExtension>` про `plain` ничего не знал, и здесь стояло
 * приведение. Тип элемента у расширения `any` по той же причине, что у
 * `batch` в `TBatchCollectionFacade`: расширения инвариантны по элементу.
 */
export abstract class TCollectionComponent<
	TItem extends object,
	TExtensions extends { plain: TPlainExtension<any> } & Record<string, IExtension<any>>,
	TEvents extends TCollectionComponentEvents<TItem> = TCollectionComponentEvents<TItem>,
> extends TComponent<IComponentProps, TEvents> {
	public readonly engine: TCollectionEngine<TItem, TExtensions>

	constructor(
		props: Partial<IComponentProps> = {},
		options: ICollectionComponentOptions<TItem, TExtensions>,
	) {
		super(props, options)

		this.engine = options.engine

		// Системные события движка: item:*, change:items/count, reset.
		this.events.relay(this.extensions.plain.events, [
			'item:add:before',
			'item:added',
			'item:remove:before',
			'item:removed',
			'item:update:before',
			'item:updated',
			'item:move:before',
			'item:moved',
			'items:clear:before',
			'change:items',
			'change:count',
			'reset',
		])

		// Релеи событий движка (включая engine:create).
		this.events.relay(this.engine.events, ['engine:create'])
	}

	get extensions(): TExtensions {
		return this.engine.extensions
	}

	batch(action: () => void): void {
		this.engine.batch(action)
	}
}
