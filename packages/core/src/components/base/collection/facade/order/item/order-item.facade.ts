import { TCollectionItemComponent } from '../../collection-item-component.class'
import type { TItemContext } from '../../../engine'
import type { IExtension, IOrderItemExtension } from '../../../engine'
import type { TComponentEvents } from '../../../../component'

/** Item-адаптеры, без которых этот фасад не собрать. */
export type TOrderItemAdapters<TItem extends object> = {
	order: IOrderItemExtension<TItem>
}

/**
 * Фасад элемента коллекции, у которого есть порядок.
 *
 * Порядок есть у всех четырёх элементов (Collapse, List, Select, Tabs),
 * поэтому это самая нижняя item-база. Дальше ветвится: выбор — у трёх,
 * активность — только у таба.
 *
 * `-1` при отсутствующем контексте — не «в начало», а «порядка ещё нет»:
 * контекст ставится adapter-слоем после того, как известна коллекция-владелец,
 * и до этого момента элемент вне неё.
 */
export abstract class TOrderItemFacade<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>>,
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TCollectionItemComponent<TItem, TExtensions, TEvents> {
	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._adapters.order.events, ['change:order'])
	}

	get order(): number {
		return this._context ? this._adapters.order.order : -1
	}

	/**
	 * Типизированный доступ к item-адаптерам.
	 *
	 * `TItemContext` отдаёт `adapters` широким типом, поэтому раньше каждый
	 * фасад приводил его сам — в List через `as unknown as`, в ListBox через
	 * `as any` с комментарием, что тип адаптера неполон. Приведение осталось
	 * одно, в базе, и наследник сужает его через дженерик.
	 */
	protected get _adapters(): TOrderItemAdapters<TItem> {
		return this._context?.adapters as unknown as TOrderItemAdapters<TItem>
	}
}
