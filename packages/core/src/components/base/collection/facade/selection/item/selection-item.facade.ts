import { TOrderItemFacade } from '../../order/item'
import type { TItemContext } from '../../../engine'
import type {
	IExtension,
	ISelectionCollectionItemProps,
	TOrderExtension,
	TSelectionExtension,
} from '../../../engine'
import type { TSelectionItemFacadeEvents } from '../../types'

/**
 * Фасад элемента, который можно выбрать: `selected` плюс порядок из базы.
 *
 * Подключают элементы Accordion, ListBox, Select и Tags. У таба не выбор, а
 * активация, поэтому он наследует только `TOrderItemFacade`.
 *
 * Сеттер здесь есть, и это исправление: у опции Select его не было, хотя
 * contribution объявляет `selected` записываемым пропом, — присваивание
 * падало с `TypeError`. У Accordion и List сеттер был. Одно свойство в трёх
 * копиях успело дать три разных API.
 */
export abstract class TSelectionItemFacade<
	TItem extends object,
	TExtensions extends {
		order: TOrderExtension<any>
		selection: TSelectionExtension<any>
	} & Record<string, IExtension<any>>,
	TEvents extends TSelectionItemFacadeEvents = TSelectionItemFacadeEvents,
> extends TOrderItemFacade<TItem, TExtensions, TEvents> {
	/**
	 * Вне коллекции элемент не выбран — то же, что отдаёт геттер без контекста.
	 * Умолчание уходит адаптеру через декларацию пропа `selected`.
	 */
	static defaultValues: ISelectionCollectionItemProps = {
		...TOrderItemFacade.defaultValues,
		selected: false,
	}

	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.selection.events)
	}

	get selected(): boolean {
		return this._context?.adapters.selection.selected ?? false
	}

	set selected(value: boolean) {
		if (!this._context) return

		this._context.adapters.selection.selected = value
	}
}
