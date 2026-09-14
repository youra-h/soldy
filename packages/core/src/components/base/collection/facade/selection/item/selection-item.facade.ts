import { TOrderItemFacade } from '../../order/item'
import type { TItemContext } from '../../../engine'
import type { IExtension, TOrderExtension, TSelectionExtension } from '../../../engine'
import type { TComponentEvents } from '../../../../component'

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
	TExtensions extends {
		order: TOrderExtension<any>
		selection: TSelectionExtension<any>
	} & Record<string, IExtension<any>>,
	TEvents extends TComponentEvents = TComponentEvents & Record<string, (...args: any[]) => any>,
> extends TOrderItemFacade<TItem, TExtensions, TEvents> {
	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.selection.events, ['change:selected'])
	}

	get selected(): boolean {
		return this._context?.adapters.selection.selected ?? false
	}

	set selected(value: boolean) {
		if (!this._context) return

		this._context.adapters.selection.selected = value
	}
}
