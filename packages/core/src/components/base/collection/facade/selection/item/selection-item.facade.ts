import { TOrderItemFacade } from '../../order/item'
import type { TOrderItemAdapters } from '../../order/item'
import type { TItemContext } from '../../../engine'
import type { IExtension, ISelectionItemExtension } from '../../../engine'
import type { TComponentEvents } from '../../../../component'

export type TSelectionItemAdapters<TItem extends object> = TOrderItemAdapters<TItem> & {
	selection: ISelectionItemExtension<TItem>
}

/**
 * Фасад элемента, который можно выбрать: `selected` плюс порядок из базы.
 *
 * Подключают элементы Accordion, List (и через него ListBox) и Select. У таба
 * не выбор, а активация, поэтому он наследует только `TOrderItemFacade`.
 *
 * Сеттер здесь есть, и это исправление: у опции Select его не было, хотя
 * contribution объявляет `selected` записываемым пропом, — присваивание
 * падало с `TypeError`. У Accordion и List сеттер был. Одно свойство в трёх
 * копиях успело дать три разных API.
 */
export abstract class TSelectionItemFacade<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>>,
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TOrderItemFacade<TItem, TExtensions, TEvents> {
	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._adapters.selection.events, ['change:selected'])
	}

	get selected(): boolean {
		return this._context ? this._adapters.selection.selected : false
	}

	set selected(value: boolean) {
		if (!this._context) return

		this._adapters.selection.selected = value
	}

	protected override get _adapters(): TSelectionItemAdapters<TItem> {
		return this._context?.adapters as unknown as TSelectionItemAdapters<TItem>
	}
}
