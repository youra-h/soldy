import { TCollectionItemComponent } from '../../collection-item-component.class'
import type { TItemContext } from '../../../engine'
import type { IExtension, TOrderExtension } from '../../../engine'
import type { TComponentEvents } from '../../../../component'

/**
 * Фасад элемента коллекции, у которого есть порядок.
 *
 * Порядок есть у всех четырёх элементов (Accordion, List, Select, Tabs),
 * поэтому это самая нижняя item-база. Дальше ветвится: выбор — у трёх,
 * активность — только у таба.
 *
 * `-1` при отсутствующем контексте — не «в начало», а «порядка ещё нет»:
 * контекст ставится adapter-слоем после того, как известна коллекция-владелец,
 * и до этого момента элемент вне неё.
 *
 * Набор расширений сужен до `{ order }`, как у фасадов коллекций
 * (`TBatchCollectionFacade`): без порядка фасад не подключить, и
 * `adapters.order` выводится из набора без приведения. Тип элемента у
 * расширения `any` — расширения инвариантны по элементу.
 */
export abstract class TOrderItemFacade<
	TItem extends object,
	TExtensions extends { order: TOrderExtension<any> } & Record<string, IExtension<any>>,
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TCollectionItemComponent<TItem, TExtensions, TEvents> {
	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.order.events, ['change:order'])
	}

	get order(): number {
		return this._context?.adapters.order.order ?? -1
	}
}
